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

## One Collection Multiple Candy Machine

```
sugar upload --config config/madlads.json --cache cache/madlads.json -l debug -r https://api.devnet.solana.com assets
sugar deploy --config config/madlads.json --cache cache/madlads.json -l debug -r https://api.devnet.solana.com
sugar guard add --config config/madlads.json --cache cache/madlads.json --candy-machine candyMachine
```

Bỏ 2 file collection.json và collection.png ra khỏi thư mục assets trước khi chạy các câu lệnh dưới đây

```
sugar upload --config config/smb.json --cache cache/smb.json -k owner.json -l debug -r https://api.devnet.solana.com assets
sugar deploy --config config/smb.json --cache cache/smb.json -k owner.json -l debug -r https://api.devnet.solana.com --collection-mint collectionMint
sugar guard add --config config/smb.json --cache cache/smb.json --candy-machine candyMachine

sugar upload --config config/jup.json --cache cache/jup.json -k owner.json -l debug -r https://api.devnet.solana.com assets
sugar deploy --config config/jup.json --cache cache/jup.json -k owner.json -l debug -r https://api.devnet.solana.com --collection-mint collectionMint
sugar guard add --config config/jup.json --cache cache/jup.json --candy-machine candyMachine

sugar upload --config config/wen.json --cache cache/wen.json -k owner.json -l debug -r https://api.devnet.solana.com assets
sugar deploy --config config/wen.json --cache cache/wen.json -k owner.json -l debug -r https://api.devnet.solana.com --collection-mint collectionMint
sugar guard add --config config/wen.json --cache cache/wen.json --candy-machine candyMachine
```

## Mint sugar

```
sugar mint --cache cache/madlads.json --receiver walletId
sugar mint --cache cache/jup.json --receiver walletId
sugar mint --cache cache/smb.json --receiver walletId
sugar mint --cache cache/wen.json --receiver walletId
```

## Withdraw

```
sugar withdraw --candy-machine candyMachine
```
