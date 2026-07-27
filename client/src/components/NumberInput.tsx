import * as React from "react";

type NumberInputProps = {
  value: number;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
};

export function NumberInput({
  value,
  min,
  step = 1,
  onChange,
  className,
}: NumberInputProps) {
  const [inputValue, setInputValue] = React.useState(
    value === 0 ? "" : String(value),
  );

  React.useEffect(() => {
    setInputValue(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <td className="border p-1">
    <input
      type="number"
      value={inputValue}
      min={min}
      step={step}
      inputMode="decimal"
      onWheel={(event) => {
        event.currentTarget.blur();
      }}
      onChange={(event) => {
        const nextValue = event.target.value;

        setInputValue(nextValue);

        if (nextValue === "" || nextValue === "-") {
          onChange(0);
          return;
        }

        const parsedValue = Number(nextValue);

        if (Number.isFinite(parsedValue)) {
          onChange(parsedValue);
        }
      }}
      onBlur={() => {
        if (inputValue === "" || inputValue === "-") {
          setInputValue("");
          onChange(0);
        }
      }}
      className={`
        ${className}
        h-8 w-16 rounded border p-1 text-right
        [appearance:textfield]
        [&::-webkit-inner-spin-button]:appearance-none
        [&::-webkit-outer-spin-button]:appearance-none
      `}
    />
    </td>
  );
}