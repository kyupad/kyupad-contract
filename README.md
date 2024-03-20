<p style="text-align:center; font-size:48px;font-weight: 700">
    <span>KYUPAD CONTRACT</span>
</p>

# Solana docs:

### Wallet: https://solana.com/docs/intro/wallets

### Account: https://solana.com/docs/core/accounts

### PDA Account: https://solanacookbook.com/core-concepts/pdas.html#facts

### Program: https://solana.com/docs/core/programs

### Transaction: https://solana.com/docs/core/transactions

### Instruction: https://solana.com/docs/core/transactions

### CPI: https://solana.com/docs/core/cpi

### Tài liệu học thêm nếu chưa đủ hiểu:

### https://www.soldev.app/course

### https://solanacookbook.com/vi/#đong-gop (Nên đọc bằng tiếng Anh)

### Cài đặt môi trường phát triển

### Solana docs: https://solana.com/developers/guides/getstarted/setup-local-development

## Web3.js

```
yarn add @solana/web3.js
```

## SPL-Token

```
yarn add @solana/spl-token
```

## Wallet-Adapter

```
yarn add @solana/wallet-adapter-wallets \
    @solana/wallet-adapter-base
```

## Rust

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Solana CLI

```
sh -c "$(curl -sSfL https://release.solana.com/1.18.1/install)"
```

Nếu nhận được message sau khi cài : `Please update your PATH environment variable to include the solana programs`
=> Sao chép câu lệnh ngay dưới thông báo và cập nhật vào **PATH**.

## Check version Solana CLI

```
solana --version
```

## Anchor

```
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

```
avm install latest
avm use latest
```

## Fix with linux

```
sudo apt-get update && sudo apt-get upgrade && sudo apt-get install -y pkg-config build-essential libudev-dev libssl-dev
```

## Check version Anchor

```
anchor --version
```

# Create project anchor

```
anchor init contract-empty
```

# Run project

```
solana-keygen new -o id.json
```

- Thay đổi wallet ở file `Anchor.toml` chính là file id.json vừa tạo ra
- Copy file id.json ở thư mục gốc vào từng thư mục
- WalletID: b6q9jftfVvYcdVkaYHahQ9XVaVwsSv6Ssbv2aZPa4uW

```code
[provider]
cluster = "testnet"
wallet = "id.json"
```

```
anchor build
```

# Testing

```
anchor test
```

# Deploy

Lưu ý: tài khoản phải có sol thì mới deploy thành công

```
anchor deploy
```
