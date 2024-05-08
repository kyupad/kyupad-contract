use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct InvestorCounter {
    pub remainning: u8,
}

impl InvestorCounter {
    pub const PREFIX_SEED: &'static [u8] = b"invest_counter";
}
