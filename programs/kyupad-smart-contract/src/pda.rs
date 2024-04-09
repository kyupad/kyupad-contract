use anchor_lang::solana_program::pubkey::Pubkey;

pub const PREFIX: &str = "metadata";

pub const EDITION: &str = "edition";

pub const MARKER: &str = "marker";

pub const USER: &str = "user";


pub fn find_use_authority_account(mint: &Pubkey, authority: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            PREFIX.as_bytes(),
            &mpl_token_metadata::ID.as_ref(),
            mint.as_ref(),
            USER.as_bytes(),
            authority.as_ref(),
        ],
        &mpl_token_metadata::ID,
    )
}

pub fn find_metadata_account(mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[PREFIX.as_bytes(), &mpl_token_metadata::ID.as_ref(), mint.as_ref()],
        &mpl_token_metadata::ID,
    )
}