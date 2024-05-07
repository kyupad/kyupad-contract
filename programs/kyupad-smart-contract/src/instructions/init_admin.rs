use anchor_lang::prelude::*;
use crate::{errors::KyuPadError, utils::assert_keys_equal, ID};

pub fn init_admin(ctx: Context<InitAdmin>, _address: Pubkey, permissions: Vec<Permission>) -> Result<()> {
    let kyupad_program_data = &mut ctx.accounts.kyupad_program_data;
    let signer = &ctx.accounts.signer;
    let bpf_loader_upgradeable = &ctx.accounts.bpf_loader_upgradeable;

    let (programdata_address, _) = Pubkey::find_program_address(&[ID.as_ref()], bpf_loader_upgradeable.key);

    assert_keys_equal(&programdata_address, &kyupad_program_data.key())?;

    match &kyupad_program_data.upgrade_authority_address  {
        Some(update_authority) => {
            let result = assert_keys_equal(update_authority, signer.key);

            match result {
                Ok(_) => {
                    msg!("Init successfully");
                },
                Err(_) => {
                    return Err(KyuPadError::InvalidSigner.into());
                }
            }
        }, None => {
            return Err(KyuPadError::InvalidSigner.into());
        }
        
    }

    let admin_pda = &mut ctx.accounts.admin_pda;
    admin_pda.permissions = permissions;
    Ok(())
}

#[derive(Accounts)]
#[instruction(_address: Pubkey)]
pub struct InitAdmin<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK
    #[account(
        init_if_needed, 
        payer = signer, 
        space = 8 + Admin::INIT_SPACE, 
        seeds = [b"admin", _address.as_ref()], 
        bump
     )]
    pub admin_pda: Account<'info,  Admin>,

    pub system_program: Program<'info, System>,

    /// CHECK: 
    pub bpf_loader_upgradeable: AccountInfo<'info>,

    #[account(
        owner = bpf_loader_upgradeable.key())]
    pub kyupad_program_data: Account<'info, ProgramData>,
}

#[account]
#[derive(Debug, InitSpace)]
pub struct Admin {
    #[max_len(10)]
    pub permissions: Vec<Permission> 
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum Permission {
    IdoAdmin,
    CnftAdmin,
}


