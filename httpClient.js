import axios from 'axios';
import https from 'node:https';

const SSL_OP_LEGACY_SERVER_CONNECT = 0x00000004;

const agent = new https.Agent({
  secureOptions: SSL_OP_LEGACY_SERVER_CONNECT,
});

const httpClient = axios.create({
  httpsAgent: agent,
});

export default httpClient;
