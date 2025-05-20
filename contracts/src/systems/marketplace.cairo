// Interfaces

#[starknet::interface]
pub trait IMarketplace<TContractState> {
    fn list(
        ref self: TContractState,
        collection: starknet::ContractAddress,
        token_id: u256,
        quantity: felt252,
        price: felt252,
        currency: starknet::ContractAddress,
        expiration: u64,
    );
    fn edit_listing(
        ref self: TContractState,
        order_id: u32,
        quantity: felt252,
        price: felt252,
        currency: starknet::ContractAddress,
        expiration: u64,
    );
    fn cancel_listing(ref self: TContractState, order_id: u32);
    fn delete_listing(ref self: TContractState, order_id: u32);
    fn execute_listing(ref self: TContractState, order_id: u32, quantity: felt252);
    fn offer(
        ref self: TContractState,
        collection: starknet::ContractAddress,
        token_id: u256,
        quantity: felt252,
        price: felt252,
        currency: starknet::ContractAddress,
        expiration: u64,
    );
    fn cancel_offer(ref self: TContractState, order_id: u32);
    fn delete_offer(ref self: TContractState, order_id: u32);
    fn execute_offer(ref self: TContractState, order_id: u32, quantity: felt252);
}

// Contracts

#[dojo::contract]
pub mod Marketplace {
    // Starknet imports

    use starknet::ContractAddress;

    // Dojo imports

    use dojo::world::WorldStorage;

    // Component imports

    use orderbook::components::initializable::InitializableComponent;
    use orderbook::components::buyable::BuyableComponent;
    use orderbook::components::sellable::SellableComponent;
    use orderbook::components::verifiable::VerifiableComponent;

    // Internal imports

    use marketplace::constants::{FEE_NUMERATOR, FEE_DENOMINATOR, FEE_RECEIVER, NAMESPACE};

    // Local imports

    use super::IMarketplace;

    // Components

    component!(path: InitializableComponent, storage: initializable, event: InitializableEvent);
    impl InitializableImpl = InitializableComponent::InternalImpl<ContractState>;
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
        initializable: InitializableComponent::Storage,
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
        InitializableEvent: InitializableComponent::Event,
        #[flat]
        BuyableEvent: BuyableComponent::Event,
        #[flat]
        SellableEvent: SellableComponent::Event,
        #[flat]
        VerifiableEvent: VerifiableComponent::Event,
    }

    // Constructor

    fn dojo_init(ref self: ContractState, owner: ContractAddress) {
        self.initializable.initialize(self.world_storage(), owner);
    }

    // Implementations

    #[abi(embed_v0)]
    impl MarketplaceImpl of IMarketplace<ContractState> {
        fn list(
            ref self: ContractState,
            collection: ContractAddress,
            token_id: u256,
            quantity: felt252,
            price: felt252,
            currency: ContractAddress,
            expiration: u64,
        ) {
            let world = self.world_storage();
            self.sellable.create(world, collection, token_id, quantity, price, currency, expiration)
        }

        fn edit_listing(
            ref self: ContractState,
            order_id: u32,
            quantity: felt252,
            price: felt252,
            currency: ContractAddress,
            expiration: u64,
        ) {
            let world = self.world_storage();
            self.sellable.edit(world, order_id, quantity, price, currency, expiration)
        }

        fn cancel_listing(ref self: ContractState, order_id: u32) {
            let world = self.world_storage();
            self.sellable.cancel(world, order_id)
        }

        fn delete_listing(ref self: ContractState, order_id: u32) {
            let world = self.world_storage();
            self.sellable.delete(world, order_id)
        }

        fn execute_listing(ref self: ContractState, order_id: u32, quantity: felt252) {
            let world = self.world_storage();
            self
                .sellable
                .execute(world, order_id, quantity, FEE_NUMERATOR, FEE_DENOMINATOR, FEE_RECEIVER())
        }

        fn offer(
            ref self: ContractState,
            collection: ContractAddress,
            token_id: u256,
            quantity: felt252,
            price: felt252,
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

        fn execute_offer(ref self: ContractState, order_id: u32, quantity: felt252) {
            let world = self.world_storage();
            self
                .buyable
                .execute(world, order_id, quantity, FEE_NUMERATOR, FEE_DENOMINATOR, FEE_RECEIVER())
        }
    }

    #[generate_trait]
    impl Private of PrivateTrait {
        fn world_storage(self: @ContractState) -> WorldStorage {
            self.world(@NAMESPACE())
        }
    }
}
