use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct InvestorCounter {
    #[max_len(24)]
    pub project_id: String,
    pub wallet: Pubkey,
    pub total_invested_ticket: u8,
}

impl InvestorCounter {
    pub const PREFIX_SEED: &'static [u8] = b"invest_counter";
}
