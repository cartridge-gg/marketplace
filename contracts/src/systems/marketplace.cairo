// Interfaces

#[starknet::interface]
pub trait IAdministration<TContractState> {
    fn grant_role(ref self: TContractState, account: starknet::ContractAddress, role_id: u8);
    fn revoke_role(ref self: TContractState, account: starknet::ContractAddress);
    fn pause(ref self: TContractState);
    fn resume(ref self: TContractState);
    fn set_fee(ref self: TContractState, fee_num: u32, fee_receiver: starknet::ContractAddress);
}

#[starknet::interface]
pub trait IMarketplace<TContractState> {
    fn list(
        ref self: TContractState,
        collection: starknet::ContractAddress,
        token_id: u256,
        quantity: u128,
        price: u128,
        currency: starknet::ContractAddress,
        expiration: u64,
    );
    fn cancel_listing(ref self: TContractState, order_id: u32);
    fn delete_listing(ref self: TContractState, order_id: u32);
    fn execute_listing(ref self: TContractState, order_id: u32, quantity: u128, royalties: bool);
    fn offer(
        ref self: TContractState,
        collection: starknet::ContractAddress,
        token_id: u256,
        quantity: u128,
        price: u128,
        currency: starknet::ContractAddress,
        expiration: u64,
    );
    fn cancel_offer(ref self: TContractState, order_id: u32);
    fn delete_offer(ref self: TContractState, order_id: u32);
    fn execute_offer(ref self: TContractState, order_id: u32, quantity: u128, royalties: bool);
}

// Contracts

#[dojo::contract]
pub mod Marketplace {
    // Starknet imports

    use starknet::ContractAddress;

    // Dojo imports

    use dojo::world::WorldStorage;

    // Component imports

    use orderbook::components::manageable::ManageableComponent;
    use orderbook::components::buyable::BuyableComponent;
    use orderbook::components::sellable::SellableComponent;
    use orderbook::components::verifiable::VerifiableComponent;

    // Internal imports

    use marketplace::constants::NAMESPACE;

    // Local imports

    use super::{IAdministration, IMarketplace};

    // Components

    component!(path: ManageableComponent, storage: manageable, event: ManageableEvent);
    impl ManageableImpl = ManageableComponent::InternalImpl<ContractState>;
    component!(path: BuyableComponent, storage: buyable, event: BuyableEvent);
    impl BuyableImpl = BuyableComponent::InternalImpl<ContractState>;
    component!(path: SellableComponent, storage: sellable, event: SellableEvent);
    impl SellableImpl = SellableComponent::InternalImpl<ContractState>;
    component!(path: VerifiableComponent, storage: verifiable, event: VerifiableEvent);
    impl VerifiableImpl = VerifiableComponent::InternalImpl<ContractState>;

    // Storage

    #[storage]
    struct Storage {
        #[substorage(v0)]
        manageable: ManageableComponent::Storage,
        #[substorage(v0)]
        buyable: BuyableComponent::Storage,
        #[substorage(v0)]
        sellable: SellableComponent::Storage,
        #[substorage(v0)]
        verifiable: VerifiableComponent::Storage,
    }

    // Events

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ManageableEvent: ManageableComponent::Event,
        #[flat]
        BuyableEvent: BuyableComponent::Event,
        #[flat]
        SellableEvent: SellableComponent::Event,
        #[flat]
        VerifiableEvent: VerifiableComponent::Event,
    }

    // Constructor

    fn dojo_init(
        ref self: ContractState,
        fee_num: u32,
        fee_receiver: ContractAddress,
        owner: ContractAddress,
    ) {
        self.manageable.initialize(self.world_storage(), fee_num, fee_receiver, owner);
    }

    // Implementations

    #[abi(embed_v0)]
    impl AdministrationImpl of IAdministration<ContractState> {
        fn grant_role(ref self: ContractState, account: ContractAddress, role_id: u8) {
            let world = self.world_storage();
            self.manageable.grant_role(world, account, role_id);
        }

        fn revoke_role(ref self: ContractState, account: ContractAddress) {
            let world = self.world_storage();
            self.manageable.revoke_role(world, account);
        }

        fn pause(ref self: ContractState) {
            let world = self.world_storage();
            self.manageable.pause(world);
        }

        fn resume(ref self: ContractState) {
            let world = self.world_storage();
            self.manageable.resume(world);
        }

        fn set_fee(ref self: ContractState, fee_num: u32, fee_receiver: ContractAddress) {
            let world = self.world_storage();
            self.manageable.set_fee(world, fee_num, fee_receiver);
        }
    }

    #[abi(embed_v0)]
    impl MarketplaceImpl of IMarketplace<ContractState> {
        fn list(
            ref self: ContractState,
            collection: ContractAddress,
            token_id: u256,
            quantity: u128,
            price: u128,
            currency: ContractAddress,
            expiration: u64,
        ) {
            let world = self.world_storage();
            self.sellable.create(world, collection, token_id, quantity, price, currency, expiration)
        }

        fn cancel_listing(ref self: ContractState, order_id: u32) {
            let world = self.world_storage();
            self.sellable.cancel(world, order_id)
        }

        fn delete_listing(ref self: ContractState, order_id: u32) {
            let world = self.world_storage();
            self.sellable.delete(world, order_id)
        }

        fn execute_listing(
            ref self: ContractState, order_id: u32, quantity: u128, royalties: bool,
        ) {
            let world = self.world_storage();
            self.sellable.execute(world, order_id, quantity, royalties)
        }

        fn offer(
            ref self: ContractState,
            collection: ContractAddress,
            token_id: u256,
            quantity: u128,
            price: u128,
            currency: ContractAddress,
            expiration: u64,
        ) {
            let world = self.world_storage();
            self.buyable.create(world, collection, token_id, quantity, price, currency, expiration)
        }

        fn cancel_offer(ref self: ContractState, order_id: u32) {
            let world = self.world_storage();
            self.buyable.cancel(world, order_id)
        }

        fn delete_offer(ref self: ContractState, order_id: u32) {
            let world = self.world_storage();
            self.buyable.delete(world, order_id)
        }

        fn execute_offer(ref self: ContractState, order_id: u32, quantity: u128, royalties: bool) {
            let world = self.world_storage();
            self.buyable.execute(world, order_id, quantity, royalties)
        }
    }

    #[generate_trait]
    impl Private of PrivateTrait {
        fn world_storage(self: @ContractState) -> WorldStorage {
            self.world(@NAMESPACE())
        }
    }
}
