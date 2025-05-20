#[starknet::component]
pub mod BuyableComponent {
    // Starknet imports

    use starknet::ContractAddress;

    // Dojo imports

    use dojo::world::WorldStorage;

    // Internal imports

    use orderbook::constants::BOOK_ID;
    use orderbook::store::StoreTrait;
    use orderbook::types::category::Category;
    use orderbook::models::book::BookTrait;
    use orderbook::models::order::{OrderTrait, OrderAssert};
    use orderbook::components::verifiable::{
        VerifiableComponent, VerifiableComponent::InternalImpl as VerifiableImpl,
    };

    // Storage

    #[storage]
    pub struct Storage {}

    // Events

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {}

    #[generate_trait]
    pub impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +Drop<TContractState>,
        impl Verify: VerifiableComponent::HasComponent<TContractState>,
    > of InternalTrait<TContractState> {
        fn create(
            self: @ComponentState<TContractState>,
            world: WorldStorage,
            collection: ContractAddress,
            token_id: u256,
            quantity: felt252,
            price: felt252,
            currency: ContractAddress,
            expiration: u64,
        ) {
            // [Check] Validity requirements
            let caller_address = starknet::get_caller_address();
            let verifiable = get_dep_component!(self, Verify);
            verifiable
                .assert_buy_validity(
                    owner: caller_address, currency: currency, price: price.into(),
                );

            // [Effect] Create order
            let mut store = StoreTrait::new(world);
            let mut book = store.book(BOOK_ID);
            let order_id = book.get_id();
            let time = starknet::get_block_timestamp();
            let order = OrderTrait::new(
                id: order_id,
                category: Category::Buy,
                collection: collection.into(),
                token_id: token_id,
                quantity: quantity,
                price: price,
                currency: currency.into(),
                expiration: expiration,
                now: time,
                owner: caller_address.into(),
            );

            // [Effect] Update models
            store.set_order(@order);
            store.set_book(@book);

            // [Event] Item order
            store.offer(order: order, time: time);
        }

        fn cancel(self: @ComponentState<TContractState>, world: WorldStorage, order_id: u32) {
            // [Check] Order exists
            let mut store = StoreTrait::new(world);
            let mut order = store.order(order_id);
            order.assert_does_exist();

            // [Check] Order category
            order.assert_buy_order();

            // [Check] Caller is order owner
            let caller: felt252 = starknet::get_caller_address().into();
            order.assert_is_allowed(caller);

            // [Effect] Update order
            order.cancel();

            // [Effect] Update models
            store.set_order(@order);
        }

        fn delete(self: @ComponentState<TContractState>, world: WorldStorage, order_id: u32) {
            // [Check] Order exists
            let mut store = StoreTrait::new(world);
            let mut order = store.order(order_id);
            order.assert_does_exist();

            // [Check] Order category
            order.assert_buy_order();

            // [Check] Inactive requirements
            let owner: ContractAddress = order.owner.try_into().unwrap();
            let currency: ContractAddress = order.currency.try_into().unwrap();
            let price: u256 = order.price.into();
            let verifiable = get_dep_component!(self, Verify);
            verifiable
                .assert_buy_invalidity(
                    owner: owner, expiration: order.expiration, currency: currency, price: price,
                );

            // [Effect] Update order
            order.delete();

            // [Effect] Update models
            store.set_order(@order);
        }

        fn execute(
            self: @ComponentState<TContractState>,
            world: WorldStorage,
            order_id: u32,
            quantity: felt252,
            fee_num: u16,
            fee_den: u16,
            fee_receiver: ContractAddress,
        ) {
            // [Check] Order exists
            let mut store = StoreTrait::new(world);
            let mut order = store.order(order_id);
            order.assert_does_exist();

            // [Check] Order category
            order.assert_buy_order();

            // [Check] Validity requirements
            let spender: ContractAddress = order.owner.try_into().unwrap();
            let collection: ContractAddress = order.collection.try_into().unwrap();
            let token_id: u256 = order.token_id;
            let value: u256 = order.quantity.into();

            let currency: ContractAddress = order.currency.try_into().unwrap();
            let price: u256 = order.price.into();
            let verifiable = get_dep_component!(self, Verify);
            verifiable.assert_buy_validity(owner: spender, currency: currency, price: price.into());

            // [Check] Execute requirements
            let owner: ContractAddress = starknet::get_caller_address();
            verifiable
                .assert_sell_validity(
                    owner: owner, collection: collection, token_id: token_id, value: value,
                );

            // [Effect] Execute order
            order.execute();

            // [Effect] Update models
            store.set_order(@order);

            // [Interaction] Process transfers
            // Remove fees from price
            let fee = price * fee_num.into() / fee_den.into();
            verifiable
                .pay(spender: spender, recipient: owner, currency: currency, amount: price - fee);
            verifiable
                .pay(spender: spender, recipient: fee_receiver, currency: currency, amount: fee);
            verifiable
                .transfer(
                    owner: owner,
                    collection: collection,
                    token_id: token_id,
                    value: value,
                    recipient: spender,
                );

            // [Event] Sale
            let time = starknet::get_block_timestamp();
            let from: felt252 = owner.into();
            let to: felt252 = spender.into();
            store.sale(order: order, from: from, to: to, time: time);
        }
    }
}
