# buy-bitcoin

Buys bitcoin via the GDAX api.

## Setup

* Copy `config.json.example` to `config.json`
* Generate a GDAX [Api key](https://www.gdax.com/settings/api)
* Fill in `config.json` with your API key details
* npm install -g

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