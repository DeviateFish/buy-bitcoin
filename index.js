#! /usr/bin/env node
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const Gdax = require('gdax');
const BigNumber = require('bignumber.js');

const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);
const stat = Promise.promisify(fs.stat);
const mkdir = Promise.promisify(fs.mkdir);

const CONFIG_FILENAME = 'config.json';
const CONFIG_DIRECTORY = '.buy-bitcoin';
const USD_CURRENCY = 'USD';
const BITCOIN_CURRENCY = 'BTC';
const STATUS_PENDING = 'pending';
const STATUS_DONE = 'done';

function readConfig(file) {
  return readFile(file, 'utf-8')
    .then((contents) => {
      return JSON.parse(contents);
    });
}

function pad(num) {
  return `0${num}`.slice(-2);
}

function getTimeString() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = pad(now.getUTCMonth());
  const day = pad(now.getUTCDate());
  const hour = pad(now.getUTCHours());
  const minute = pad(now.getUTCMinutes());
  const second = pad(now.getUTCSeconds());
  return `${year}-${month}-${day} ${hour}:${minute}:${second} +00:00`;
}

function log(msg, includeTimestamp) {
  let prefix = '';
  if (includeTimestamp) {
    prefix = `[${getTimeString()}]`;
  }
  console.log(`${prefix}buy-bitcoin: ${msg}`);
}

function error(msg) {
  console.error(`buy-bitcoin: ${msg}`);
}

function getHomeDir() {
  const key = process.platform == 'win32' ? 'USERPROFILE' : 'HOME';
  return process.env[key];
}

function getConfig() {
  const home = getHomeDir();
  const configLocation = path.join(path.resolve(home), CONFIG_DIRECTORY, CONFIG_FILENAME);
  return stat(configLocation)
    .catch((err) => {
      if (err.code === 'ENOENT') { 
        error('Run `buy-bitcoin --init` and populate the init file with your Coinbase Pro API credentials');
        return Promise.reject(new Error('buy-bitcoin: Not configured!'));
      } else {
        return Promise.reject(err);
      }
    })
    .then((stat) => {
      if (stat.isFile()) {
        return readConfig(configLocation);
      } else {
        return Promise.reject(new Error(`buy-bitcoin: Could not load configuration! ${configLocation} is not a file!`));
      }
    });
}

function createConfig() {
  const home = getHomeDir();
  const configDir = path.join(path.resolve(home), CONFIG_DIRECTORY);
  const configFile = path.join(configDir, CONFIG_FILENAME);
  return stat(configDir)
    .catch((err) => {
      if (err.code === 'ENOENT') {
        return mkdir(configDir);
      } else {
        return Promise.reject(err);
      }
    })
    .then(() => {
      const config = {
        key: 'YOUR_COINBASE_PRO_API_KEY',
        secret: 'YOUR_COINBASE_PRO_API_SECRET',
        passphrase: 'YOUR_COINBASE_PRO_API_PASSPHRASE',
        apiURI: 'https://api.pro.coinbase.com'
      };
      return writeFile(configFile, JSON.stringify(config, null, 2), 'utf-8');
    })
    .then(() => {
      log(`Created ${configFile}!  Please fill it out with your Coinbase Pro API credentials, then buy away!`);
    });
}

function wait(delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

function waitForOrder(client, orderId, timeout) {
  return client.getOrder(orderId)
    .then((order) => {
      if (order.status === STATUS_PENDING) {
        return wait(timeout)
          .then(() => {
            return waitForOrder(client, orderId, timeout);
          });
      } else {
        return order;
      }
    });
}

function buyBitcoin(argv) {
  const buyAmount = new BigNumber(argv);

  return getConfig()
    .then((config) => {
      const client = new Gdax.AuthenticatedClient(
        config.key,
        config.secret,
        config.passphrase,
        config.apiURI
      );
      return client.getAccounts()
        .then((accounts) => {
          const filtered = accounts.filter(account => account.currency === USD_CURRENCY);
          if (!filtered.length) {
            return Promise.reject(new Error('buy-bitcoin: Could not find USD account on Coinbase Pro!'));
          }
          const usdAccount = filtered[0];
          const accountBalance = new BigNumber(usdAccount.available);
          if (accountBalance.isLessThan(buyAmount)) {
            return Promise.reject(new Error(`buy-bitcoin: Available balance ($${accountBalance}) is less than $${buyAmount}`));
          }
          return client.getProducts();
        })
        .then((products) => {
          const filtered = products.filter(product => product.base_currency === BITCOIN_CURRENCY && product.quote_currency === USD_CURRENCY);
          if (filtered.length === 0) {
            return Promise.reject(new Error('bitcoin-buy: Could not find BTC-USD pair!'));
          }
          const product = filtered[0];
          const order = {
            side: 'buy',
            product_id: product.id,
            type: 'market',
            funds: buyAmount.toString()
          };
          return client.placeOrder(order);
        })
        .then((order) => {
          return waitForOrder(client, order.id, 2000);
        })
        .then((order) => {
          if (!order.settled || order.status !== STATUS_DONE) {
            console.error(order);
            return Promise.reject(new Error(`buy-bitcoin: Order returned an expected status: ${order.status}`));
          }
          const filledSize = new BigNumber(order.filled_size);
          const buySize = new BigNumber(order.funds);
          log(`Bought ${filledSize.toFixed(8)} BTC for $${buySize.toFixed(3)}`, true);
        });
    });
}

if (process.argv.length < 3) {
  console.log('Usage:');
  console.log('buy-bitcoin <amount>');
  console.log('Buys <amount> (denominated in USD) worth of bitcoin via the Coinbase Pro API');
  console.log('');
  console.log('buy-bitcoin --init');
  console.log('Creates an empty configuration file to hold Coinbase Pro API credentials.');
  process.exit(-1);
}

if (process.argv[2] === '--init') {
  createConfig();
} else {
  buyBitcoin(process.argv[2]);
}
