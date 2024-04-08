use anchor_lang::prelude::*;

use instructions::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

declare_id!("9iTeQZ4NqQRWcLcii1z1UxpAgBz9UXq8674g3B7biWNm");

#[program]
pub mod kyupad_smart_contract {

    use super::*;

    pub fn mint_cnft(
        ctx: Context<MintcNFT>,
        merkle_proof: Vec<[u8; 32]>,
        merkle_root: Vec<u8>,
        data: Vec<u8>,
    ) -> Result<()> {
        instructions::mint_cft(ctx, merkle_proof, merkle_root, data)
    }

    pub fn init_collection_config<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, InitCollectionConfig<'info>>,
        vec_groups_args: Vec<GroupConigArgs>,
    ) -> Result<()> {
        instructions::init_collection_config(ctx, vec_groups_args)
    }
}
