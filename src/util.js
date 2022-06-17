export function unit (value) {

	if (value < 0)
		return '-' + unit(-value);

	if (value < 1000)
		return value.toFixed(1) + ' ';

	else if (value < 10**6)
		return (value / 10**3).toFixed(3) + ' kilo';

	else if (value < 10**9)
		return (value / 10**6).toFixed(3) + ' mega';

	else if (value < 10**12)
		return (value / 10**9).toFixed(3) + ' giga';

	else if (value < 10**15)
		return (value / 10**12).toFixed(3) + ' tera';

	else if (value < 10**18)
		return (value / 10**15).toFixed(3) + ' peta';

	else if (value < 10**21)
		return (value / 10**18).toFixed(3) + ' exo';

	else return value.toExponential(3);
}