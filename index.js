#! /usr/bin/env node
const fs = require('fs');
const Promise = require('bluebird');
const Gdax = require('gdax');
const BigNumber = require('bignumber.js');

const readFile = Promise.promisify(fs.readFile);

const USD_CURRENCY = 'USD';
const BITCOIN_CURRENCY = 'BTC';
const STATUS_PENDING = 'pending';
const STATUS_DONE = 'done';

if (process.argv.length < 3) {
  console.log('Usage:');
  console.log('buy-bitcoin <amount>');
  process.exit(-1);
}

const buyAmount = new BigNumber(process.argv[2]);

function readConfig() {
  return readFile('config.json', 'utf-8')
    .then((contents) => {
      return JSON.parse(contents);
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

readConfig()
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
          return Promise.reject(new Error('buy-bitcoin: Could not find USD account on GDAX!'));
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
        console.log(`buy-bitcoin: Done, bought ${filledSize.toFixed(8)} BTC for $${buySize.toFixed(3)}`);
      });
  });
