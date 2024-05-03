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
    pub destination: Pubkey,
    pub token_address: Pubkey,
    pub ticket_size: f32,
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
    pub destination: Pubkey,
    pub token_address: Pubkey,
    pub ticket_size: f32,
}
