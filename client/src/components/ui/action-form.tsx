import { Button } from "@cartridge/ui";
import { useForm } from "react-hook-form";
import { SUPPORTED_CURRENCIES } from "../../currency";

export interface ActionFormData {
	price: string;
	currency: string;
	quantity: string;
	expirationDays: string;
}

export interface ActionFormProps {
	title: string;
	submitLabel: string;
	defaultValues?: Partial<ActionFormData>;
	maxExpirationDays?: number;
	onSubmit: (formData: ActionFormData) => Promise<void>;
	onCancel?: () => void;
}

export function ActionForm({
	title,
	submitLabel,
	defaultValues = {},
	maxExpirationDays = 30,
	onSubmit,
	onCancel,
}: ActionFormProps) {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<ActionFormData>({
		defaultValues: {
			price: defaultValues.price || "",
			currency: defaultValues.currency || "STRK",
			quantity: defaultValues.quantity || "0",
			expirationDays: defaultValues.expirationDays || "1",
		},
	});

	const onSubmitHandler = async (data: ActionFormData) => {
		try {
			await onSubmit(data);
			// Reset form after successful submission
			reset();
		} catch (error) {
			console.error(`Failed to ${submitLabel.toLowerCase()}:`, error);
		}
	};

	return (
		<div className="space-y-4 p-4 border rounded-lg bg-background">
			<h3 className="text-lg font-semibold">{title}</h3>
			<form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-3">
				<div>
					<label
						htmlFor={`${title}-price`}
						className="block text-sm font-medium mb-1"
					>
						Price
					</label>
					<input
						id={`${title}-price`}
						type="number"
						step="0.000001"
						{...register("price", {
							required: "Price is required",
							min: { value: 0, message: "Price must be positive" },
						})}
						className="w-full px-3 py-2 border rounded-md"
						placeholder="Enter price"
					/>
					{errors.price && (
						<p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
					)}
				</div>

				<div>
					<label
						htmlFor={`${title}-currency`}
						className="block text-sm font-medium mb-1"
					>
						Currency
					</label>
					<select
						id={`${title}-currency`}
						{...register("currency", { required: "Currency is required" })}
						className="w-full px-3 py-2 border rounded-md"
					>
						{SUPPORTED_CURRENCIES.map((curr) => (
							<option key={curr} value={curr}>
								{curr}
							</option>
						))}
					</select>
					{errors.currency && (
						<p className="mt-1 text-sm text-red-600">
							{errors.currency.message}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor={`${title}-quantity`}
						className="block text-sm font-medium mb-1"
					>
						Quantity
					</label>
					<input
						id={`${title}-quantity`}
						type="number"
						{...register("quantity", {
							required: "Quantity is required",
							min: { value: 0, message: "Quantity must be non-negative" },
						})}
						className="w-full px-3 py-2 border rounded-md"
					/>
					{errors.quantity && (
						<p className="mt-1 text-sm text-red-600">
							{errors.quantity.message}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor={`${title}-expiration`}
						className="block text-sm font-medium mb-1"
					>
						Expiration (days)
					</label>
					<input
						id={`${title}-expiration`}
						type="number"
						{...register("expirationDays", {
							required: "Expiration is required",
							min: { value: 1, message: "Minimum 1 day" },
							max: {
								value: maxExpirationDays,
								message: `Maximum ${maxExpirationDays} days`,
							},
						})}
						className="w-full px-3 py-2 border rounded-md"
					/>
					{errors.expirationDays && (
						<p className="mt-1 text-sm text-red-600">
							{errors.expirationDays.message}
						</p>
					)}
				</div>

				<div className="flex gap-2">
					<Button type="submit" variant="primary" disabled={isSubmitting}>
						{isSubmitting ? "Submitting..." : submitLabel}
					</Button>
					{onCancel && (
						<Button type="button" variant="secondary" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</div>
			</form>
		</div>
	);
}
