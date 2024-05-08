use anchor_lang::solana_program;
use anchor_lang::{prelude::*, system_program::CreateAccount};
use solana_program::program_memory::sol_memcmp;
use solana_program::pubkey::PUBKEY_BYTES;

use crate::errors::KyuPadError;

pub fn verify(proof: &[[u8; 32]], root: &[u8; 32], leaf: &[u8; 32]) -> bool {
    let mut computed_hash = *leaf;

    for proof_element in proof.iter() {
        if computed_hash <= *proof_element {
            // hash (current computed hash + current element of the proof)
            computed_hash = solana_program::keccak::hashv(&[&computed_hash, proof_element]).0
        } else {
            // hash (current element of the proof + current computed hash)
            computed_hash = solana_program::keccak::hashv(&[proof_element, &computed_hash]).0;
        }
    }

    // check if the computed hash (root) is equal to the provided root
    computed_hash == *root
}

pub fn create_account<'info>(
    system_program: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    seeds: &[&[u8]],
    bump: u8,
    space: u64,
    owner: &Pubkey,
) -> Result<()> {
    let seeds_signer = &mut seeds.to_vec();
    let binding = [bump];
    seeds_signer.push(&binding);

    // signer seeds must equal seeds of to address
    anchor_lang::system_program::create_account(
        CpiContext::new(system_program, CreateAccount { from, to }).with_signer(&[seeds_signer]),
        Rent::get()?.minimum_balance(space.try_into().unwrap()),
        space,
        owner,
    )
}

pub fn cmp_pubkeys(a: &Pubkey, b: &Pubkey) -> bool {
    sol_memcmp(a.as_ref(), b.as_ref(), PUBKEY_BYTES) == 0
}

pub fn assert_keys_equal(key1: &Pubkey, key2: &Pubkey) -> Result<()> {
    if !cmp_pubkeys(key1, key2) {
        err!(KyuPadError::PublicKeyMismatch)
    } else {
        Ok(())
    }
}

pub fn assert_owned_by(account: &AccountInfo, owner: &Pubkey) -> Result<()> {
    if !cmp_pubkeys(account.owner, owner) {
        err!(KyuPadError::IncorrectOwner)
    } else {
        Ok(())
    }
}