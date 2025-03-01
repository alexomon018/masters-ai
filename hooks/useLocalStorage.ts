import { Dispatch, SetStateAction, useEffect, useState } from "react";
import useMountEffect from "./useMountEffect";

const getStorageValue = <T>(key: string, defaultValue: T) => {
	// getting stored value
	const saved =
		typeof window !== "undefined" ? localStorage?.getItem(key) : undefined;
	return saved ? JSON.parse(saved) : defaultValue;
};

const useLocalStorage = <T>(
	key: string,
	defaultValue: T
): [T, Dispatch<SetStateAction<T>>, boolean] => {
	const [value, setValue] = useState<T>(() =>
		getStorageValue(key, defaultValue)
	);
	const [isReady, setIsReady] = useState(false);

	useMountEffect(() => {
		setValue(getStorageValue(key, defaultValue));
		setIsReady(true);
	});

	useEffect(() => {
		localStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);

	return [value, setValue, isReady];
};

export default useLocalStorage;
