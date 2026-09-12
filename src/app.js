import './style.css';
import { addWallet, checkOperator } from './wallet.js';

const status = document.querySelector('#operator-status');
const operatorMessage = document.querySelector('#operator-message');
const walletMessage = document.querySelector('#wallet-message');
const walletAddress = document.querySelector('#wallet-address');
const phrase = document.querySelector('#recovery-phrase');
const checkButton = document.querySelector('#check-operator');
const addButton = document.querySelector('#add-wallet');

function showOperator(result) {
  status.textContent = result.status === 'online' ? 'Online' : 'Unavailable';
  status.className = `status ${result.status === 'online' ? 'online' : 'unavailable'}`;
  operatorMessage.textContent = result.message;
}

checkButton.addEventListener('click', async () => {
  checkButton.disabled = true;
  status.textContent = 'Checking';
  status.className = 'status neutral';
  operatorMessage.textContent = 'Calling the public Arkade Signet endpoint…';
  showOperator(await checkOperator());
  checkButton.disabled = false;
});

addButton.addEventListener('click', async () => {
  addButton.disabled = true;
  walletAddress.textContent = '';
  walletMessage.textContent = 'Checking Signet and deriving the public wallet address…';
  try {
    const wallet = await addWallet(phrase.value);
    phrase.value = '';
    showOperator(wallet.operator);
    walletMessage.textContent = 'Wallet added for this page session.';
    walletAddress.textContent = wallet.arkadeAddress;
  } catch (error) {
    walletMessage.textContent = error instanceof Error ? error.message : 'Wallet setup failed.';
  } finally {
    addButton.disabled = false;
  }
});
