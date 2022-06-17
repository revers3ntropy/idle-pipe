import './App.css';
import React, {useEffect, useState} from "react";
import socket, {handlers} from './client.js';
import {unit} from "./util";

const exponent = 1.1;

const startState = () => ({
	pipe: 0,
	material: 0,

	pipePerGram: 0.001,

	miners: 0,
	builders: 0,
	minersLevel: 1,
	buildersLevel: 1,
	minerEfficiency: 1,
	builderEfficiency: 1,

	builderFactories: 0,
	minerFactories: 0,
	builderFactoryLevel: 1,
	minerFactoryLevel: 1,
	minerFactoryEfficiency: 1,
	builderFactoryEfficiency: 1,

	forceShowAll: false,
	debugMenu: false,
	timer: 0,
	cheated: false
});

function EfficiencySlider ({ stateProp, state, updateState }) {
	return <>
		<div style={{
			display: 'flex',
			justifyContent: 'space-evenly'
		}}>
			{(state[stateProp]*100).toPrecision(3)}%
			<input type='range' max='1' min='0' step='0.01' defaultValue={state[stateProp]} onChange={evt => {
				updateState({
					[stateProp]: evt.target.value
				});
			}}/>
		</div>
	</>
}

function BuyButton ({ state, stateProp, cost, updateState, text }) {
	const canAfford = state.material >= cost;
	return  <>
		<button onClick={() => {
			if (!canAfford) return;
			updateState({
				[stateProp]: state[stateProp] + 1,
				material: state.material - cost
			});
		}} style={{
			border: canAfford ? 'var(--text)' : 'var(--text-light)',
			background: 'transparent',
			cursor: canAfford ? 'pointer': 'not-allowed'
		}}>
			{text} ({unit(cost)}grams)
		</button>
	</>
}

function App() {

	let initState = localStorage.getItem('idlePipeState');
	if (!initState)
		initState = JSON.stringify(startState());

	const [state, setState] = useState(JSON.parse(initState));
	const updateState = args => {
		setState({
			...state,
			...args
		});
	};

	if (!state.hasOwnProperty('minerFactoryEfficiency'))
		updateState({
			minerFactoryEfficiency: 1,
			builderFactoryEfficiency: 1,
		});
	if (!state.hasOwnProperty('cheated'))
		updateState({
			cheated: false
		});


	const [highScore, setHighScore] = useState(0);

	handlers['get-high-score'] = ({ score }) => {
		setHighScore(score);
		if (score > state.score)
			socket.send(JSON.stringify({
				handler: 'update-high-score',
				id: localStorage.getItem('id'),
				score
			}));
	};



	// 0th Derivative
	const pipePerSecond = () => Math.min(state.builders, state.material * state.pipePerGram) * state.buildersLevel ** exponent * state.builderEfficiency;
	const materialPerSecond = () => state.miners * state.minersLevel ** exponent * state.minerEfficiency
									- pipePerSecond() * (1/state.pipePerGram)
									- minersPerSecond() * minerBuildCost()
									- buildersPerSecond() * builderBuildCost();

	// 1st Derivative
	const builderBuildCost = () => state.buildersLevel ** exponent * (1/state.pipePerGram);
	const minerBuildCost = () => state.minersLevel ** exponent * (1/state.pipePerGram);
	const minerUpgradeCost = () => state.minersLevel ** exponent * ((state.miners+1) ** (1/exponent)) * (1/state.pipePerGram);
	const upgradeBuilderCost = () => state.buildersLevel ** exponent * ((state.builders+1) ** (1/exponent)) * (1/state.pipePerGram);
	const buildersPerSecond = () => {
		const n = Math.min(state.material/builderBuildCost(), Math.floor(state.builderFactories * state.builderFactoryEfficiency * state.builderFactoryLevel ** exponent));
		if (n < 1) return 0;
		return Math.floor(n);
	}
	const minersPerSecond = () => {
		const n = Math.min(state.material/minerBuildCost(), Math.floor(state.minerFactories * state.minerFactoryEfficiency* state.minerFactoryLevel ** exponent));
		if (n < 1) return 0;
		return Math.floor(n);
	}

	// 2nd Derivative
	const buildBuilderFactoryCost = () => state.builderFactoryLevel ** exponent * state.buildersLevel * 10**7;
	const buildMinerFactoryCost = () => state.minerFactoryLevel ** exponent * state.minersLevel * 10**7;
	const minerFactoryUpgradeCost = () => state.minerFactoryLevel ** exponent * state.minerFactoryEfficiency * ((state.minerFactories+1) ** (1/exponent)) * (1/state.pipePerGram) * 1000 + 10**9;
	const builderFactoryUpgradeCost = () => state.buildersLevel ** exponent * state.builderFactoryEfficiency * ((state.builderFactories+1) ** (1/exponent)) * (1/state.pipePerGram) * 1000 + 10**9;

	useEffect(() => {
		let time = performance.now();

		if (socket.readyState === socket.OPEN)
			socket.send(JSON.stringify({
				handler: 'get-high-score',
				id: localStorage.getItem('id')
			}));

		const mainLoop = setInterval(() => {
			// MAIN LOOP

			const deltaTime = (performance.now() - time) / 1000;
			time = performance.now();

			const deltaPipe = pipePerSecond() * deltaTime;
			const deltaMaterial = materialPerSecond() * deltaTime
			const deltaMiners = minersPerSecond() * deltaTime;
			const deltaBuilders = buildersPerSecond() * deltaTime;

			setState({
				...state,
				pipe: state.pipe + deltaPipe,
				miners: state.miners + deltaMiners,
				builders: state.builders + deltaBuilders,

				material: state.material + deltaMaterial,

				timer: (state.timer || 0) + deltaTime
			});

			// save
			localStorage.setItem('idlePipeState', JSON.stringify({...state}));

			if (state.pipe > highScore && !state.cheated) {
				setHighScore(state.pipe);
				if (socket.readyState === socket.OPEN) {
					socket.send(JSON.stringify({
						handler: 'update-high-score',
						id: localStorage.getItem('id'),
						score: state.pipe
					}));
				}

			}
		}, 20);

		return () => clearInterval(mainLoop);

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state, highScore]);

	useEffect(() => {
		const onESC = (ev) => {
			if (ev.key === "Tab") {
				setState({
					...state,
					debugMenu: !state.debugMenu
				});
			}
		};
		window.addEventListener("keyup", onESC);
		return () => {
			window.removeEventListener("keyup", onESC);
		};
	}, [state]);

	return (
		<div className="App">
			<div className='section'>
				<div className='left'>
					Pipe<br/>
					<span style={{
						fontSize: '40px',
						margin: '3px'
					}}>
						{unit(state.pipe)}meters
					</span><br/>
					({unit(pipePerSecond())}meters/second)<br/>

					<BuyButton state={state} updateState={updateState}
							   stateProp='pipe' cost={1/state.pipePerGram} text='Build Pipe' />
				</div>
				<div className='right'>
					Material<br/>
					<span style={{
						fontSize: '40px',
						margin: '3px'
					}}>
						{unit(state.material)}grams
					</span><br/>
					({unit(materialPerSecond())}grams/second)<br/>
					<button onClick={() => {
						updateState({
							material: state.material + 500
						});
					}}>Mine Material</button>
				</div>
			</div>

			<div className='section'>
				<div className='left'>
					<div>
						Builders (lvl {state.buildersLevel})
						<p style={{fontSize: '30px', margin: '5px'}}>
							{state.builders.toFixed(0)}
						</p>
						{buildersPerSecond().toFixed(0)}/s
					</div>

					<BuyButton state={state} updateState={updateState}
							   stateProp='builders' cost={builderBuildCost()} text='Build Builder' /><br/>
					<BuyButton state={state} updateState={updateState}
							   stateProp='buildersLevel' cost={upgradeBuilderCost()} text='Upgrade Builders' />
					<EfficiencySlider state={state} updateState={updateState} stateProp='builderEfficiency' />
				</div>
				<div className='right'>
					<div>
						Miners (lvl {state.minersLevel})
						<p style={{fontSize: '30px', margin: '5px'}}>
							{state.miners.toFixed(0)}
						</p>
						{minersPerSecond().toFixed(0)}/s
					</div>
					<BuyButton state={state} updateState={updateState}
							   stateProp='miners' cost={minerBuildCost()} text='Build Miner' /><br/>
					<BuyButton state={state} updateState={updateState}
							   stateProp='minersLevel' cost={minerUpgradeCost()} text='Upgrade Miners' />
					<EfficiencySlider state={state} updateState={updateState} stateProp='minerEfficiency' />

				</div>
			</div>

			{state.pipe > 10**6 || state.forceShowAll ? <div className='section'>
				<div className='left'>
					<p>
						Builder Factories (lvl {state.builderFactoryLevel}): {state.builderFactories}
					</p>

					<BuyButton state={state} updateState={updateState}
							   stateProp='builderFactories' cost={buildBuilderFactoryCost()} text='Build Builder Factory' /><br/>
					<BuyButton state={state} updateState={updateState}
							   stateProp='builderFactoryLevel' cost={builderFactoryUpgradeCost()} text='Upgrade Builder Factories' />
					<EfficiencySlider state={state} updateState={updateState} stateProp='builderFactoryEfficiency' />
				</div>
				<div className='right'>
					<p>
						Miner Factories (lvl {state.minerFactoryLevel}): {state.minerFactories}
					</p>
					<BuyButton state={state} updateState={updateState}
							   stateProp='minerFactories' cost={buildMinerFactoryCost()} text='Build miner Factory' /><br/>
					<BuyButton state={state} updateState={updateState}
							   stateProp='minerFactoryLevel' cost={minerFactoryUpgradeCost()} text='Upgrade Miner Factories' />
					<EfficiencySlider state={state} updateState={updateState} stateProp='minerFactoryEfficiency' />

				</div>
			</div> : <></>}

			{state.debugMenu ? <>
				<div style={{
					border: '1px solid grey',
					padding: '5px',
					margin: '10px 5px'
				}}>
					<button onClick={() => console.log(state)}>Log State</button>
					<button onClick={() => setState(startState())}>Reset</button>
					<button onClick={() => updateState({pipe: (state.pipe + 1) * 10, cheated: true})}>Give Pipe</button>
					<button onClick={() => updateState({material: (state.material + 1) * 10, cheated: true})}>Give Material</button>
					<button onClick={() => updateState({builders: (state.builders + 1) * 10, cheated: true})}>Give Builders</button>
					<button onClick={() => updateState({miners: (state.miners + 1) * 10, cheated: true})}>Give Miners</button>
					<button onClick={() => updateState({forceShowAll: !state.forceShowAll, cheated: true})}>
						{state.forceShowAll ? 'Hide Locked' : 'Show All'}
					</button>
					<span style={{color: 'red'}}>
						{state.cheated ?
							' You have been disqualified' :
							' Warning: Using these will result in disqualification'
						}
					</span>
				</div>
			</> : <></>}
		</div>
	);
}

export default App;
