use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct ProjectCounter {
    pub remainning: u32,
}

impl ProjectCounter {
    pub const PREFIX_SEED: &'static [u8] = b"project_counter";
}
