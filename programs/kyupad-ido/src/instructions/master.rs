use anchor_lang::prelude::*;

use crate::{program::KyupadIdo, ID};

pub fn init_master(ctx: Context<InitMaster>, address: Pubkey) -> Result<()> {
    let master = &mut ctx.accounts.master_pda;
    master.master_key = address;
    Ok(())
}

pub fn transfer_master_rights(ctx: Context<TransferMasterRights>, new_master_address: Pubkey) -> Result<()> {
    let master = &mut ctx.accounts.master_pda;
    master.master_key = new_master_address;
    Ok(())
}


#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct InitMaster<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init, 
        payer = signer, 
        space = 8 + Master::INIT_SPACE, 
        seeds = [b"master"], 
        bump
     )]
    pub master_pda: Account<'info,  Master>,

    pub system_program: Program<'info, System>,

    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, KyupadIdo>,

    #[account(constraint = program_data.upgrade_authority_address == Some(signer.key()))]
    pub program_data: Account<'info, ProgramData>,
}

#[derive(Accounts)]
pub struct TransferMasterRights<'info> {
    #[account(
        mut, 
        constraint = signer.key() == master_pda.master_key
    )]
    pub signer: Signer<'info>,

    #[account(
        mut,
        owner = ID,
        seeds = [b"master"], 
        bump
     )]
    pub master_pda: Account<'info,  Master>,
}

#[account]
#[derive(Debug, InitSpace)]
pub struct Master {
    pub master_key: Pubkey
}