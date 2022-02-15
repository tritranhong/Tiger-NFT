#[derive(Deserialize, Serialize, BorshSerialize, BorshDeserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct AuctionPrice {
    is_native: bool,
    contract_id: AccountId,
    decimals: U64,
    amount: U128
}



#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize)]
pub struct auction {
    pub owner_by_id: AccountId,
    pub approval_id: u64,
    pub nft_ocntract_id: NFTContractId,
    pub token_id: TokenId,
    pub auction_conditions: U128
}


impl Contract {

    #[payable]
    pub fn create_auction(
        &mut self,
        auction_token: TokenId,
        start_price: Balance,
        start_time: u64,
        end_time: u64,
    ) -> Auction {
        let owner_id = self.tokens.owner_by_id.get(&auction_token).unwrap();
        assert_eq!(
            owner_id,
            env::predecessor_account_id(),
            "You not own this NFT"
        );
        assert_eq!(
            self.auctioned_tokens.contains(&auction_token),
            false,
            "Already auctioned"
        );
        assert_eq!(
            env::attached_deposit(),
            CREATE_AUCTION_FEE,
            "Require 1N to create an auction"
        );
        self.tokens.internal_transfer(
            &env::predecessor_account_id(),
            &env::current_account_id(),
            &auction_token,
            None,
            None,
        );
        let mut auction_ids: Vector<u128>;
        if self
            .auctions_by_owner
            .get(&env::predecessor_account_id())
            .is_none()
        {
            auction_ids = Vector::new(b"auction_ids".to_vec());
        } else {
            auction_ids = self
                .auctions_by_owner
                .get(&env::predecessor_account_id())
                .unwrap();
        }
        auction_ids.push(&self.total_auctions);
        let auction = Auction {
            owner: owner_id,
            auction_id: self.total_auctions,
            auction_token: auction_token.clone(),
            start_price,
            start_time: start_time * 1_000_000_000,
            end_time: end_time * 1_000_000_000,
            current_price: start_price,
            winner: String::new(),
            is_near_claimed: false,
            is_nft_claimed: false,
        };
        self.auctions_by_owner
            .insert(&env::predecessor_account_id(), &auction_ids);
        self.auction_by_id.insert(&self.total_auctions, &auction);
        self.auctioned_tokens.insert(&auction_token);
        self.total_auctions += 1;
        auction
    }
    
    #[payable]
    pub fn bid(&mut self, auction_id: u128) {
        let mut auction = self.auction_by_id.get(&auction_id).unwrap_or_else(|| {
            panic!("This auction does not exist");
        });
        assert_eq!(
            env::block_timestamp() > auction.start_time,
            true,
            "This auction has not started"
        );
        assert_eq!(
            env::block_timestamp() < auction.end_time,
            true,
            "This auction has already done"
        );
        assert_eq!(
            env::attached_deposit() > auction.current_price,
            true,
            "Price must be greater than current winner's price"
        );
        if !(auction.winner == String::new()) {
            let old_winner = Promise::new(auction.winner);
            old_winner.transfer(auction.current_price - ENROLL_FEE);
        }
        auction.winner = env::predecessor_account_id();
        auction.current_price = env::attached_deposit();
        self.auction_by_id.insert(&auction_id, &auction);
    }
    
    #[payable]
    pub fn claim_nft(&mut self, auction_id: u128) {
        let mut auction = self.auction_by_id.get(&auction_id).unwrap_or_else(|| {
            panic!("This auction does not exist");
        });
        assert_eq!(
            env::block_timestamp() > auction.end_time,
            true,
            "The auction is not over yet"
        );
        assert_eq!(
            env::predecessor_account_id(),
            auction.winner,
            "You are not the winner"
        );
        assert_eq!(
            auction.clone().is_nft_claimed,
            false,
            "You has already claimed NFT"
        );
        self.tokens.internal_transfer_unguarded(
            &auction.auction_token,
            &env::current_account_id(),
            &auction.winner,
        );
        auction.is_nft_claimed = true;
        self.auctioned_tokens.remove(&auction.auction_token);
        self.auction_by_id.insert(&auction_id, &auction);
    }
    
    #[payable]
    pub fn claim_near(&mut self, auction_id: u128) {
        let mut auction = self.auction_by_id.get(&auction_id).unwrap_or_else(|| {
            panic!("This auction does not exist");
        });
        assert_eq!(
            env::predecessor_account_id(),
            auction.owner,
            "You are not operator of this auction"
        );
        assert_eq!(
            env::block_timestamp() > auction.end_time,
            true,
            "The auction is not over yet"
        );
        assert_eq!(auction.is_near_claimed, false, "You has already claimed N");
        Promise::new(auction.clone().owner).transfer(auction.current_price);
        auction.is_near_claimed = true;
        self.auction_by_id.insert(&auction_id, &auction);
    }
    
    #[payable]
    pub fn claim_back_nft(&mut self, auction_id: u128) {
        let mut auction = self.auction_by_id.get(&auction_id).unwrap_or_else(|| {
            panic!("This auction does not exist");
        });
        assert_eq!(
            env::predecessor_account_id(),
            auction.owner,
            "You are not operator of this auction"
        );
        assert_eq!(
            env::block_timestamp() > auction.end_time,
            true,
            "The auction is not over yet"
        );
        assert_eq!(auction.winner, String::new(), "The NFT has sold");
        self.tokens.internal_transfer_unguarded(
            &auction.auction_token,
            &env::current_account_id(),
            &auction.owner,
        );
        auction.is_nft_claimed = true;
        self.auctioned_tokens.remove(&auction.auction_token);
        self.auction_by_id.insert(&auction_id, &auction);
    }
    
    pub fn get_auction(&self, auction_id: u128) -> Auction {
        self.auction_by_id.get(&auction_id).unwrap()
    }
    }
}
