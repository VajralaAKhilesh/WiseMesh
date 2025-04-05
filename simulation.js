import React, { useState, useEffect } from 'react';
import { Battery, AlertTriangle, Wifi, Server, Power, Moon, Activity, Thermometer, Droplets } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const WSNLeachSimulation = () => {
  const GRID_SIZE = 100;
  const NODE_COUNT = 30;
  const CLUSTER_COUNT = 4;
  const BASE_STATION = { x: 50, y: 10 };
  
  // Calculate grid dimensions for even distribution
  const GRID_ROWS = Math.floor(Math.sqrt(NODE_COUNT));
  const GRID_COLS = Math.ceil(NODE_COUNT / GRID_ROWS);

  const [nodes, setNodes] = useState([]);
  const [clusterHeads, setClusterHeads] = useState([]);
  const [round, setRound] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dataTransmissions, setDataTransmissions] = useState([]);

  // Initialize nodes in a grid pattern with slight randomness
  useEffect(() => {
    const initialNodes = [];
    const marginX = 15; // Margin from edges
    const marginY = 15;
    const spacingX = (GRID_SIZE - 2 * marginX) / (GRID_COLS - 1);
    const spacingY = (GRID_SIZE - 2 * marginY) / (GRID_ROWS - 1);

    for (let i = 0; i < NODE_COUNT; i++) {
      const row = Math.floor(i / GRID_COLS);
      const col = i % GRID_COLS;
      
      // Add small random offset for natural appearance
      const randomOffsetX = (Math.random() - 0.5) * (spacingX * 0.3);
      const randomOffsetY = (Math.random() - 0.5) * (spacingY * 0.3);

      const x = marginX + col * spacingX + randomOffsetX;
      const y = marginY + row * spacingY + randomOffsetY;

      initialNodes.push({
        id: i + 1,
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
        battery: 100,
        status: 'active',
        sleeping: false,
        isFaulty: Math.random() < 0.1,
        temperature: 20 + Math.random() * 10,
        humidity: 40 + Math.random() * 30,
        clusterHead: null,
        dataCollected: 0,
        lastTransmission: Date.now(),
        sleepCycle: Math.random() * 10,
        dataPoints: Array.from({ length: 10 }, () => ({
          time: Date.now() - Math.random() * 1000000,
          energy: 100 - Math.random() * 20,
          temp: 20 + Math.random() * 10,
          humid: 40 + Math.random() * 30
        })).sort((a, b) => a.time - b.time)
      });
    }

    setNodes(initialNodes);
    selectClusterHeads(initialNodes);
  }, []);

  const selectClusterHeads = (currentNodes) => {
    const newHeads = currentNodes
      .filter(node => node.battery > 50 && !node.isFaulty)
      .sort(() => Math.random() - 0.5)
      .slice(0, CLUSTER_COUNT)
      .map(node => node.id);

    const updatedNodes = currentNodes.map(node => ({
      ...node,
      status: newHeads.includes(node.id) ? 'clusterHead' : 'active',
      clusterHead: null
    }));

    updatedNodes.forEach(node => {
      if (node.status !== 'clusterHead') {
        const heads = updatedNodes.filter(n => n.status === 'clusterHead');
        const nearest = heads.reduce((a, b) => {
          const distA = Math.sqrt(Math.pow(node.x - a.x, 2) + Math.pow(node.y - a.y, 2));
          const distB = Math.sqrt(Math.pow(node.x - b.x, 2) + Math.pow(node.y - b.y, 2));
          return distA < distB ? a : b;
        });
        node.clusterHead = nearest.id;
      }
    });

    setNodes(updatedNodes);
    setClusterHeads(newHeads);
  };

  // Network simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => {
        return prev.map(node => {
          const shouldSleep = Math.sin(round / 10 + node.sleepCycle) > 0.7;
          const energyDrain = node.status === 'clusterHead' ? 2 : (shouldSleep ? 0.2 : 1);

          return {
            ...node,
            sleeping: shouldSleep && node.status !== 'clusterHead',
            battery: Math.max(0, node.battery - energyDrain),
            temperature: node.temperature + (Math.random() - 0.5) * 0.5,
            humidity: node.humidity + (Math.random() - 0.5) * 2,
            dataCollected: node.dataCollected + (shouldSleep ? 0 : Math.random() * 5),
            lastTransmission: shouldSleep ? node.lastTransmission : Date.now(),
            dataPoints: [...node.dataPoints.slice(1), {
              time: Date.now(),
              energy: node.battery,
              temp: node.temperature,
              humid: node.humidity
            }]
          };
        });
      });

      if (round % 3 === 0) {
        setDataTransmissions(prev => {
          const newTransmissions = nodes
            .filter(node => !node.sleeping && !node.isFaulty && node.battery > 10)
            .map(node => {
              if (node.status === 'clusterHead') {
                return {
                  id: ${Date.now()}-${node.id}-base,
                  from: { x: node.x, y: node.y },
                  to: BASE_STATION,
                  progress: 0,
                  type: 'toBase'
                };
              } else if (node.clusterHead) {
                const head = nodes.find(n => n.id === node.clusterHead);
                return head ? {
                  id: ${Date.now()}-${node.id}-${head.id},
                  from: { x: node.x, y: node.y },
                  to: { x: head.x, y: head.y },
                  progress: 0,
                  type: 'toCluster'
                } : null;
              }
              return null;
            })
            .filter(Boolean);

          return [...prev.filter(t => t.progress < 1), ...newTransmissions]
            .map(t => ({ ...t, progress: t.progress + 0.1 }));
        });
      }

      if (round % 10 === 0) {
        selectClusterHeads(nodes);
      }

      setRound(r => r + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [round]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>WSN LEACH Protocol Simulation</span>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Round: {round}</span>
              <div className="flex items-center space-x-2">
                <Activity className="text-green-500" size={16} />
                <span className="text-sm">Active: {nodes.filter(n => !n.sleeping && !n.isFaulty).length}</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-96 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border-2 border-blue-200">
            {/* Base Station */}
            <div 
              className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: ${BASE_STATION.x}%, top: ${BASE_STATION.y}% }}
            >
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
                <Server className="text-white" size={24} />
              </div>
              <span className="text-xs font-medium mt-1">Base Station</span>
            </div>

            {/* Network Visualization */}
            <svg className="absolute inset-0 w-full h-full">
              {nodes.map(node => 
                node.status !== 'clusterHead' && node.clusterHead && !node.sleeping && (
                  <line
                    key={conn-${node.id}}
                    x1={${node.x}%}
                    y1={${node.y}%}
                    x2={${nodes.find(n => n.id === node.clusterHead)?.x}%}
                    y2={${nodes.find(n => n.id === node.clusterHead)?.y}%}
                    stroke="rgba(59, 130, 246, 0.2)"
                    strokeWidth="1"
                    strokeDasharray="4"
                  />
                )
              )}
              {dataTransmissions.map(t => (
                <circle
                  key={t.id}
                  cx={${t.from.x + (t.to.x - t.from.x) * t.progress}%}
                  cy={${t.from.y + (t.to.y - t.from.y) * t.progress}%}
                  r="4"
                  fill={t.type === 'toBase' ? '#2563eb' : '#60a5fa'}
                >
                  <animate
                    attributeName="r"
                    values="2;4;2"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <div
                key={node.id}
                className={`absolute cursor-pointer transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 ${
                  node.status === 'clusterHead' ? 'z-20' : 'z-10'
                }`}
                style={{ left: ${node.x}%, top: ${node.y}% }}
                onClick={() => setSelectedNode(node)}
              >
                <div className={`relative p-2 rounded-full ${
                  node.status === 'clusterHead' ? 'bg-blue-500 shadow-lg' :
                  node.sleeping ? 'bg-gray-300' : 'bg-white shadow'
                }`}>
                  {node.status === 'clusterHead' ? (
                    <Wifi className="text-white" size={20} />
                  ) : node.sleeping ? (
                    <Moon className="text-gray-600" size={16} />
                  ) : (
                    <Power className={node.isFaulty ? 'text-red-500' : 'text-blue-500'} size={16} />
                  )}
                  {node.isFaulty && (
                    <AlertTriangle className="absolute -top-2 -right-2 text-red-500" size={16} />
                  )}
                  <Battery className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 ${
                    node.battery > 60 ? 'text-green-500' :
                    node.battery > 30 ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>

          {selectedNode && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Node {selectedNode.id} Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Power size={16} />
                      <p>Status: {selectedNode.sleeping ? 'Sleeping' : selectedNode.status}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Battery size={16} />
                      <p>Battery: {selectedNode.battery.toFixed(1)}%</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Thermometer size={16} />
                      <p>Temperature: {selectedNode.temperature.toFixed(1)}°C</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Droplets size={16} />
                      <p>Humidity: {selectedNode.humidity.toFixed(1)}%</p>
                    </div>
                  </div>
                  <LineChart
                    width={300}
                    height={200}
                    data={selectedNode.dataPoints}
                    margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tickFormatter={(time) => new Date(time).toLocaleTimeString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(time) => new Date(time).toLocaleTimeString()} />
                    <Legend />
                    <Line type="monotone" dataKey="energy" stroke="#2563eb" name="Energy" />
                    <Line type="monotone" dataKey="temp" stroke="#dc2626" name="Temperature" />
                    <Line type="monotone" dataKey="humid" stroke="#2563eb" name="Humidity" />
                  </LineChart>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WSNLeachSimulation;
