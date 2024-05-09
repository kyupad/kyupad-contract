use anchor_lang::prelude::*;
use mpl_bubblegum::instructions::CreateTreeConfigCpiBuilder;
use spl_account_compression::{program::SplAccountCompression, Noop};

use crate::{Admin, ID};

pub fn create_tree_config(ctx: Context<CreateTree>, max_depth: u32, max_buffer_size: u32, public: Option<bool>, _tree_space: u32) -> Result<()> {
    let seeds: &[&[u8]] = &[b"update_authority"];

    let (_, bump) = Pubkey::find_program_address(&seeds, &ID);

    let seeds_signer = &mut seeds.to_vec();
    let binding = [bump];
    seeds_signer.push(&binding);

    // create tree 
    CreateTreeConfigCpiBuilder::new(&ctx.accounts.mpl_bubble_gum_program)
    .compression_program(&ctx.accounts.compression_program)
    .log_wrapper(&ctx.accounts.log_wrapper)
    .merkle_tree(&ctx.accounts.merkle_tree)
    .tree_config(&ctx.accounts.tree_config)
    .payer(&ctx.accounts.creator)
    .system_program(&ctx.accounts.system_program)
    .tree_creator(&ctx.accounts.update_authority)
    .max_depth(max_depth)
    .max_buffer_size(max_buffer_size)
    .public(
        match public {
        Some(_) =>  true,
        None => false
    }).invoke_signed(&[seeds_signer])?;
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(_tree_space: u32)]
pub struct CreateTree<'info> {
    #[account(
        mut,         
        constraint = creator.key() == admin_pda.admin_key
    )]    
    
    pub creator: Signer<'info>,

    #[account(
        seeds=[b"admin", creator.key().as_ref()],  
        bump
    )]
    pub admin_pda: Account<'info, Admin>,

    #[account(mut)]
    /// CHECK:
    pub merkle_tree: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK:
    pub tree_config: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    #[account(
        init_if_needed, 
        payer = creator, 
        space = 0,
        seeds = [b"update_authority"], 
        bump, 
    )]
    /// CHECK:
    pub update_authority: AccountInfo<'info>,

    /// CHECK:
    pub mpl_bubble_gum_program: AccountInfo<'info>, // 1
    pub compression_program: Program<'info, SplAccountCompression>, // 2
    pub log_wrapper: Program<'info, Noop>, // 3
}
