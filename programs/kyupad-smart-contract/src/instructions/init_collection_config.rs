use anchor_lang::prelude::*;

use crate::{state::BpfWriter, utils::create_account, ID};

pub fn init_collection_config<'c: 'info, 'info>(    
    ctx: Context<'_, '_, 'c, 'info, InitCollectionConfig<'info>>,
    vec_groups_args: Vec<GroupConigArgs>
) -> Result<()> {
    let mut vec_groups: Vec<GroupConig> = vec![];
    let collection_mint = &ctx.accounts.collection_mint;
    let groups = &mut ctx.accounts.groups;
    let system_program = &ctx.accounts.system_program;
    let creator = &ctx.accounts.creator;

    let remaining_accounts_iter = &mut ctx.remaining_accounts.iter();

    for gca in vec_groups_args.iter() {
       let new_group_config = GroupConig {
            id: gca.id.clone(),
            start_date: gca.start_date,
            end_date: gca.end_date,
            merkle_root: gca.merkle_root.clone(), 
            mint_limit: gca.mint_limit,
            destination: collection_mint.key().clone(),
            payment: gca.payment,
            box_tax: gca.box_tax,
            max_mint: gca.max_mint
        };

        TmpGroupData::initialize(creator.to_account_info(), groups.to_account_info(), next_account_info(remaining_accounts_iter)?, system_program.to_account_info(), gca.merkle_root.clone(), gca.max_mint)?;
        
        vec_groups.push(new_group_config);
    }
    groups.collection_mint = collection_mint.key().clone();
    groups.groups_config = vec_groups;

    Ok(())
}

#[derive(Accounts)]
pub struct InitCollectionConfig<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK:
    pub collection_mint: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer = creator, 
        space = 8 + Groups::SIZE, 
        seeds=[b"groups", creator.key().as_ref(), collection_mint.key().as_ref()], 
        bump
    )]
    pub groups: Account<'info, Groups>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Debug)]
pub struct Groups {
    // 32 bytes
    pub collection_mint: Pubkey,
    // Max 10 groups in 1 collection
    // 4 + 10 * GroupConig.SIZE
    pub groups_config: Vec<GroupConig>,
}

impl Groups {
    pub const SIZE: usize = 32 + (4 + 10 * GroupConig::SIZE);
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GroupConig {
    // 2 bytes
    pub id: String,
    // 8 bytes
    pub start_date: u64,
    // 8 bytes
    pub end_date: u64,
    // 4 + 32 bytes
    pub merkle_root: Vec<u8>,
    // 1 bytes, total_mint_per_wallet
    pub mint_limit: u8,
    // 32 bytes
    pub destination: Pubkey,
    // 4 bytes
    pub payment: f32,
    // 4 bytes
    pub box_tax: Option<f32>,
    // 2 bytes, pool_supply
    pub max_mint: u16    
}

impl GroupConig {
    pub const SIZE: usize = 2 + 8 + 8 + (4 + 32) + 1 + 32 + 4 + (1 + 4) + 2;
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GroupConigArgs {
    id: String,
    start_date: u64,
    end_date: u64,
    merkle_root: Vec<u8>,
    mint_limit: u8,
    payment: f32,
    box_tax: Option<f32>,
    max_mint: u16 
}

#[account]
#[derive(Debug)]
pub struct TmpGroupData {
    pub remaining_assets: u16,
}

impl TmpGroupData {
    pub const SEED: &'static [u8; 14] = b"tmp_group_data";
    pub const SPACE: usize = 8 + 2;

    fn from<'info>(x: &'info AccountInfo<'info>) -> Account<'info, Self> {
        Account::try_from_unchecked(x).unwrap()
    }

    pub fn serialize(&self, info: AccountInfo) -> Result<()> {
        let dst: &mut [u8] = &mut info.try_borrow_mut_data().unwrap();
        let mut writer: BpfWriter<&mut [u8]> = BpfWriter::new(dst);
        TmpGroupData::try_serialize(self, &mut writer)
    }

    pub fn create(&mut self, remaining_assets: u16) -> Result<()> {
        self.remaining_assets = remaining_assets;
        Ok(())
    }

    pub fn initialize<'info>(
        payer: AccountInfo<'info>,
        groups: AccountInfo<'info>,
        tmp_group_data: &'info AccountInfo<'info>,
        system_program: AccountInfo<'info>,
        merkle_root: Vec<u8>,
        remaining_assets: u16,
    ) -> Result<()> {
        let seeds: &[&[u8]] = &[Self::SEED, groups.key.as_ref(), merkle_root.as_ref()];

        let (_, bump) = Pubkey::find_program_address(seeds, &ID);

        create_account(system_program, payer.clone(), tmp_group_data.clone(), seeds, bump, Self::SPACE, &ID)?;

        let mut tmp_group_data_ser = TmpGroupData::from(&tmp_group_data);
        tmp_group_data_ser.create(remaining_assets)?;

        tmp_group_data_ser.serialize(tmp_group_data.to_account_info())?;
        Ok(())
    }
}