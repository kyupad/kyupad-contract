use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct ProjectConfig {
    #[max_len(24)]
    pub id: String,
    pub start_date: i64,
    pub end_date: i64,
    #[max_len(32)]
    pub merkle_root: Vec<u8>,
    pub vault_address: Pubkey,
    pub token_address: Option<Pubkey>,
    pub ticket_size: u64,
    pub token_offered: u32,
    pub total_ticket: u32,
    pub token_program: Option<Pubkey>,
}

impl ProjectConfig {
    pub const PREFIX_SEED: &'static [u8] = b"project_config";
}

#[derive(InitSpace, Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProjectConfigArgs {
    #[max_len(24)]
    pub id: String,
    pub start_date: i64,
    pub end_date: i64,
    #[max_len(32)]
    pub merkle_root: Vec<u8>,
    pub token_address: Option<Pubkey>,
    pub ticket_size: u64,
    pub token_offered: u32,
    pub total_ticket: u32,
}
