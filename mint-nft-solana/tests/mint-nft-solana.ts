import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MintNftSolana } from "../target/types/mint_nft_solana";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { assert } from "chai";

describe("mint-nft-solana", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  // Retrieve the TokenContract struct from our smart contract
  const program = anchor.workspace.MintNftSolana as Program<MintNftSolana>;

  // Generate a random keypair that will represent our token
  const mintKey: anchor.web3.Keypair = anchor.web3.Keypair.generate();

  // AssociatedTokenAccount for anchor's workspace wallet
  let associatedTokenAccount = undefined;

  it("Mint a token", async () => {
    console.log(
      "-------------------------test mint a token-------------------------"
    );
    // Get anchor's wallet's public key
    const key = anchor.AnchorProvider.env().publicKey;

    // Get the amount of SOL needed to pay rent for our Token Mint
    const lamports: number =
      await program.provider.connection.getMinimumBalanceForRentExemption(
        MINT_SIZE
      );

    // Get the ATA for a token and the account that we want to own the ATA (but it might not existing on the SOL network yet)
    associatedTokenAccount = await getAssociatedTokenAddress(
      mintKey.publicKey,
      key
    );

    // Fires a list of instructions
    const mint_tx = new anchor.web3.Transaction().add(
      // Use anchor to create an account from the mint key that we created
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: key,
        newAccountPubkey: mintKey.publicKey,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
        lamports,
      }),
      // Fire a transaction to create our mint account that is controlled by our anchor wallet
      createInitializeMintInstruction(mintKey.publicKey, 0, key, key),
      // Create the ATA account that is associated with our mint on our anchor wallet
      createAssociatedTokenAccountInstruction(
        key,
        associatedTokenAccount,
        key,
        mintKey.publicKey
      )
    );

    // sends and create the transaction
    const res = await anchor.AnchorProvider.env().sendAndConfirm(mint_tx, [
      mintKey,
    ]);

    console.log(
      await program.provider.connection.getParsedAccountInfo(mintKey.publicKey)
    );

    console.log("Account: ", res);
    console.log("Mint key: ", mintKey.publicKey.toString());
    console.log("User: ", key.toString());

    // Executes our code to mint our token into our specified ATA
    let amount = 10;
    await program.methods
      .mintToken(new anchor.BN(amount))
      .accounts({
        mint: mintKey.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAccount: associatedTokenAccount,
        authority: key,
      })
      .rpc();

    // Get minted token amount on the ATA for our anchor wallet
    const minted = (
      await program.provider.connection.getParsedAccountInfo(
        associatedTokenAccount
      )
    ).value.data.parsed.info.tokenAmount.amount;

    assert.equal(minted, amount);
  });

  it("Transfer token", async () => {
    console.log(
      "-------------------------test transfer token-------------------------"
    );
    // Get anchor's wallet's public key
    const myWallet = anchor.AnchorProvider.env().wallet.publicKey;
    // Wallet that will receive the token
    const toWallet: anchor.web3.Keypair = anchor.web3.Keypair.generate();
    // The ATA for a token on the to wallet (but might not exist yet)
    const toATA = await getAssociatedTokenAddress(
      mintKey.publicKey,
      toWallet.publicKey
    );

    // Fires a list of instructions
    const mint_tx = new anchor.web3.Transaction().add(
      // Create the ATA account that is associated with our To wallet
      createAssociatedTokenAccountInstruction(
        myWallet,
        toATA,
        toWallet.publicKey,
        mintKey.publicKey
      )
    );

    // Sends and create the transaction
    const res = await anchor.AnchorProvider.env().sendAndConfirm(mint_tx, []);
    console.log(
      await program.provider.connection.getParsedAccountInfo(mintKey.publicKey)
    );

    console.log("Account: ", res);
    console.log("Mint key: ", mintKey.publicKey.toString());
    console.log("User: ", myWallet.toString());

    // Executes our transfer smart contract
    let amount = 10;
    await program.methods
      .transferToken(new anchor.BN(amount))
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        from: associatedTokenAccount,
        fromAuthority: myWallet,
        to: toATA,
      })
      .rpc();

    // Get minted token amount on the ATA for our anchor wallet
    const minted = (
      await program.provider.connection.getParsedAccountInfo(toATA)
    ).value.data.parsed.info.tokenAmount.amount;

    console.log("minted: ", minted);

    assert.equal(minted, amount);
  });
});
