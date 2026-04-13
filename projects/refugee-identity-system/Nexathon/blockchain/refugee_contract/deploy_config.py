import logging

import algokit_utils

logger = logging.getLogger(__name__)


# define deployment behaviour based on supplied app spec
def deploy() -> None:
    # Import from blockchain package (moved from smart_contracts to Nexathon/blockchain)
    from blockchain.artifacts.refugee_contract.refugee_contract_client import (
        RefugeeContractFactory,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer_ = algorand.account.from_environment("DEPLOYER")

    # If DEPLOYER_MNEMONIC is set, that account starts with 0 µALGO on a fresh LocalNet and app creation
    # will fail with "overspend". Fund from the default LocalNet dispenser before deploy.
    if algorand.client.is_localnet():
        algorand.account.ensure_funded_from_environment(
            deployer_,
            algokit_utils.AlgoAmount(algo=20),
        )

    factory = algorand.client.get_typed_app_factory(
        RefugeeContractFactory, default_sender=deployer_.address
    )

    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.AppendApp,
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
    )

    if result.operation_performed in [
        algokit_utils.OperationPerformed.Create,
        algokit_utils.OperationPerformed.Replace,
    ]:
        # Fund app account for BoxMap MBR (registrars) and inner txns
        algorand.send.payment(
            algokit_utils.PaymentParams(
                amount=algokit_utils.AlgoAmount(algo=1),
                sender=deployer_.address,
                receiver=app_client.app_address,
            )
        )
        logger.info(
            f"Deployed RefugeeContract ({app_client.app_id}) at {app_client.app_address}. "
            "Admin: deployer. Use add_registrar, register, claim_aid, migrate_wallet."
        )
