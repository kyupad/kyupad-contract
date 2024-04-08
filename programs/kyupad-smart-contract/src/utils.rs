use anchor_lang::solana_program;
use anchor_lang::{prelude::*, system_program::CreateAccount};

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
    space: usize,
    owner: &Pubkey,
) -> Result<()> {
    let seeds_signer = &mut seeds.to_vec();
    let binding = [bump];
    seeds_signer.push(&binding);

    // signer seeds must equal seeds of to address
    anchor_lang::system_program::create_account(
        CpiContext::new(system_program, CreateAccount { from, to }).with_signer(&[seeds_signer]),
        Rent::get()?.minimum_balance(space),
        space.try_into().unwrap(),
        owner,
    )
}
