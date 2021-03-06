# buy-bitcoin

Buys bitcoin via the Coinbase Pro API.

## Setup

* `npm install -g buy-bitcoin`
* Generate a Coinbase Pro [Api key](https://pro.coinbase.com/profile/api)
* `buy-bitcoin --init`
* Fill in `config.json` with your API key details
* `buy-bitcoin <amount>`

## Usage

`buy-bitcoin <usd amount>`

This simply places a market buy against the BTC-USD pair, purchasing the specified amount of Bitcoin at the current market price.

## Applications

### Weekly buy:

Schedule a weekly buy with cron!  Use the below to buy $100 in Bitcoin every Monday morning at 9:00 AM:

```
0 9 * * 1 buy-bitcoin 100
```

### Random buy:

Buy whenever!  Just run `buy-bitcoin 50` to buy $50 of Bitcoin right now.


## Change Log

 * v0.7.4
   * Updates to match GDAX -> Coinbase Pro name change
   * Basically, swap out `api.gdax.com` with `api.pro.coinbase.com`
 * v0.7.3
   * Added changelog and tweaked reporting slightly
 * v0.7.2
   * Add timestamps to log message
 * v0.7.1
   * README fix -- correct usage
 * v0.7.0
   * First public version
   * Documentation and configuration changes
 * v0.6.0
   * Prototype

