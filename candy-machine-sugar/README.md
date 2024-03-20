## Step 1

Install sugar cli

```
bash <(curl -sSf https://sugar.metaplex.com/install.sh)
```

pubkey: 5joHam4BWRY8dLP4TiS4K9MeDWbLZ2rT6WvRRbBQPzL

```
solana-keygen new -o onwer.json
```

pubkey: 3yM3Y1oDCPxNSHUDjB6QEswCDz1bkaCuiihvEdA8tu1R

```
solana-keygen new -o creator.json
```

## Step 2

```
sugar config create
```

```
sugar upload
```

Save value of Candy machine ID and Collection mint ID

```
sugar deploy
```

```
sugar verify
```

## Step 3

Change guard, eg:

```json
{
  "tokenStandard": "pnft",
  "number": 10,
  "symbol": "TEST",
  "sellerFeeBasisPoints": 500,
  "isMutable": true,
  "isSequential": false,
  "ruleSet": "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9",
  "creators": [
    {
      "address": "PanbgtcTiZ2PveV96t2FHSffiLHXXjMuhvoabUUKKm8",
      "share": 50
    },
    {
      "address": "PanbgtcTiZ2PveV96t2FHSffiLHXXjMuhvoabUUKKm8",
      "share": 50
    }
  ],
  "hiddenSettings": null,
  "uploadMethod": "bundlr",
  "awsConfig": null,
  "nftStorageAuthToken": null,
  "shdwStorageAccount": null,
  "pinataConfig": null,
  "sdriveApiKey": null,
  "guards": {
    "default": {
      "botTax": {
        "value": 0.01,
        "lastInstruction": true
      }
    },
    "groups": [
      {
        "label": "OGs",
        "guards": {
          "startDate": {
            "date": "2022-10-20 12:00:00 +0000"
          },
          "tokenGate": {
            "amount": 1,
            "mint": "7nE1GmnMmDKiycFkpHF7mKtxt356FQzVonZqBWsTWZNf"
          },
          "solPayment": {
            "value": 1,
            "destination": "PanbgtcTiZ2PveV96t2FHSffiLHXXjMuhvoabUUKKm8"
          }
        }
      },
      {
        "label": "Public",
        "guards": {
          "startDate": {
            "date": "2022-10-20 18:00:00 +0000"
          },
          "solPayment": {
            "value": 2,
            "destination": "PanbgtcTiZ2PveV96t2FHSffiLHXXjMuhvoabUUKKm8"
          }
        }
      }
    ]
  }
}
```

```
sugar guard add
```

```
sugar guard show
```

## Whitelist

```link
https://developers.metaplex.com/candy-machine/guards/allow-list#overview
```