use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::*;

pub fn update_whitelist(
    ctx: Context<UpdateWhitelist>,
    update_whitelist_args: UpdateWhitelistArgs,
) -> Result<()> {
    let project = &mut ctx.accounts.project;

    project.merkle_root = update_whitelist_args.merkle_root;
    Ok(())
}

pub fn update_vault_address(ctx: Context<UpdateVaultAddress>, _project_id: String) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let vault_address = &ctx.accounts.vault_address;

    project.vault_address = vault_address.key();
    Ok(())
}

#[derive(Accounts)]
#[instruction(update_config_project: UpdateWhitelistArgs)]
pub struct UpdateWhitelist<'info> {
    #[account(
        mut,
        constraint = creator.key() == admin_pda.admin_key
    )]
    pub creator: Signer<'info>,

    #[account(
        seeds=[b"admin", creator.key().as_ref()],  
        bump,
        owner = ID,
    )]
    /// CHECK:
    pub admin_pda: Account<'info, Admin>,

    #[account(
        mut,
        seeds = [ProjectConfig::PREFIX_SEED, update_config_project.project_id.as_bytes()],
        bump,
        owner = ID,
    )]
    pub project: Account<'info, ProjectConfig>,
}

#[derive(Accounts)]
#[instruction(_project_id: String)]
pub struct UpdateVaultAddress<'info> {
    #[account(
        mut,
        constraint = signer.key() == master_pda.master_key
    )]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"master"],
        bump,       
        owner = ID,
    )]
    pub master_pda: Account<'info, Master>,

    #[account(
        mut,
        seeds = [ProjectConfig::PREFIX_SEED, _project_id.as_bytes()],
        bump,
        owner = ID,
    )]
    pub project: Account<'info, ProjectConfig>,

    pub vault_address: Account<'info, TokenAccount>,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize)]
pub struct UpdateWhitelistArgs {
    pub project_id: String,
    pub merkle_root: Vec<u8>,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize)]
pub struct UpdateVaultAddressArgs {
    pub project_id: String,
    pub vault_address: Pubkey,
}
