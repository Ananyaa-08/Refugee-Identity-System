import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MNEMONIC = 'jazz left soda perfect head hire dove advice convince front wood liar bronze solve more planet fuel much umbrella access space original climb absorb spin';
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = '';
const ALGOD_TOKEN = '';

// Path to your ARC-56 JSON
const APP_SPEC_PATH = path.join(__dirname, 'blockchain', 'artifacts', 'refugee_contract', 'RefugeeContract.arc56.json');

async function deploy() {
    const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
    const deployer = algosdk.mnemonicToSecretKey(MNEMONIC);
    
    console.log('Deployer Address:', deployer.addr);
    
    // Check balance
    const accountInfo = await algodClient.accountInformation(deployer.addr).do();
    console.log('Balance:', accountInfo.amount / 1_000_000, 'ALGO');
    
    if (accountInfo.amount < 1_000_000) {
        console.error('ERROR: Account needs more ALGO for deployment. Please fund it at https://bank.testnet.algorand.network/');
        return;
    }

    const appSpec = JSON.parse(fs.readFileSync(APP_SPEC_PATH, 'utf8'));
    
    // Simple deployment using raw transactions
    // In a full Algokit setup, we'd use AppFactory, but for a one-off script, raw is easier.
    
    const params = await algodClient.getTransactionParams().do();
    
    // 1. Create Application
    const approvalProgram = new Uint8Array(Buffer.from(appSpec.byteCode.approval, 'base64'));
    const clearProgram = new Uint8Array(Buffer.from(appSpec.byteCode.clear, 'base64'));
    
    const txn = algosdk.makeApplicationCreateTxnFromObject({
        from: deployer.addr,
        suggestedParams: params,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram: approvalProgram,
        clearProgram: clearProgram,
        numLocalInts: 3,
        numLocalByteSlices: 4,
        numGlobalInts: 1,
        numGlobalByteSlices: 1,
        // Optional: Add admin to global state mapping if needed via app arguments
        // But our contract sets admin as Txn.sender in main_create
    });

    const signedTxn = txn.signTxn(deployer.sk);
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    console.log('Deploying application... TXID:', txId);
    
    console.log('Waiting for confirmation (this may take 10-20 seconds)...');
    const result = await algosdk.waitForConfirmation(algodClient, txId, 10);
    const appId = result['application-index'];
    
    console.log('\n✅ SUCCESS! Refugee Identity System Deployed.');
    console.log('New Application ID:', appId);
    console.log('\n👉 Update REFUGEE_APP_ID in Nexathon/src/contracts/config.js with this ID');
}

deploy().catch(err => {
    console.error('Deployment Failed:', err);
});
