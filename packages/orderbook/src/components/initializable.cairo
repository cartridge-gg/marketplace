#[starknet::component]
pub mod InitializableComponent {
    // Starknet imports

    use starknet::ContractAddress;

    // Dojo imports

    use dojo::world::WorldStorage;

    // Internal imports

    use orderbook::constants::BOOK_ID;
    use orderbook::store::StoreTrait;
    use orderbook::models::book::BookTrait;

    // Storage

    #[storage]
    pub struct Storage {}

    // Events

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {}

    #[generate_trait]
    pub impl InternalImpl<
        TContractState, +HasComponent<TContractState>,
    > of InternalTrait<TContractState> {
        fn initialize(
            self: @ComponentState<TContractState>, world: WorldStorage, owner: ContractAddress,
        ) {
            // [Effect] Initialize component
            let mut store = StoreTrait::new(world);
            let book = BookTrait::new(BOOK_ID, owner.into());
            store.set_book(@book);
        }
    }
}
