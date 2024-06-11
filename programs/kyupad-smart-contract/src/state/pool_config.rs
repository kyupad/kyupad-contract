use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke, system_instruction},
};

#[derive(InitSpace, Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PoolConfig {
    #[max_len(2)]
    pub id: String,
    pub start_date: i64,
    pub end_date: i64,
    #[max_len(32)]
    pub merkle_root: Vec<u8>,
    pub total_mint_per_wallet: u8,
    pub destination: Pubkey,
    pub payment: f32,
    pub pool_supply: u16,
    #[max_len(1, 50, 2)]
    pub exclusion_pools: Option<Vec<String>>,
}

impl PoolConfig {
    pub fn actions<'info>(
        &self,
        payer: AccountInfo<'info>,
        destination: AccountInfo<'info>,
        system_program: AccountInfo<'info>,
    ) -> Result<()> {
        invoke(
            &system_instruction::transfer(
                &payer.key(),
                &destination.key(),
                sol_to_lamports(self.payment),
            ),
            &[
                payer.clone(),
                destination.to_account_info(),
                system_program.to_account_info(),
            ],
        )?;
        Ok(())
    }
}

fn sol_to_lamports(sol_amount: f32) -> u64 {
    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    let lamports = (sol_amount * LAMPORTS_PER_SOL as f32) as u64;

    lamports
}
