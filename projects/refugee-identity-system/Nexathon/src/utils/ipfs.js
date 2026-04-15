import axios from 'axios';

const PINATA_KEY    = 'YOUR_PINATA_API_KEY_HERE';
const PINATA_SECRET = 'YOUR_PINATA_SECRET_KEY_HERE';

export const uploadToIPFS = async (data) => {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      { pinataContent: data },
      { headers: {
          'pinata_api_key': PINATA_KEY,
          'pinata_secret_api_key': PINATA_SECRET
      }}
    );
    return response.data.IpfsHash;
  } catch (err) {
    console.error('IPFS upload failed:', err);
    throw err;
  }
};

export const fetchFromIPFS = async (cid) => {
  const url = 'https://gateway.pinata.cloud/ipfs/' + cid;
  const response = await axios.get(url);
  return response.data;
};
