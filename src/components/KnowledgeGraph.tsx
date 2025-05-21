import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import knowledgeGraphService, { GraphNode, GraphEdge, GraphData } from '../services/KnowledgeGraphService';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { FIREBASE_HOSTING_URL } from '../config';

interface KnowledgeGraphProps {
  width?: number;
  height?: number;
  fullScreen?: boolean;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ 
  width = 600, // Increased default width for better visualization
  height = 500, // Increased default height for better visualization
  fullScreen = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Track actual dimensions
  const [svgWidth, setSvgWidth] = useState(width);
  const [svgHeight, setSvgHeight] = useState(height);
  
  // Update dimensions if window size changes or fullScreen changes
  useEffect(() => {
    if (fullScreen) {
      setSvgWidth(window.innerWidth);
      setSvgHeight(window.innerHeight - 50); // Leave some space for controls
    } else {
      setSvgWidth(width);
      setSvgHeight(height);
    }
  }, [width, height, fullScreen]);
  
  // Initialize DB and load graph data
  useEffect(() => {
    async function initAndLoad() {
      setLoading(true);
      // Initialize IndexedDB
      const inited = await knowledgeGraphService.initialize();
      if (!inited) {
        setError('Failed to initialize knowledge graph database');
        setLoading(false);
        return;
      }
      try {
        const data = await knowledgeGraphService.getGraph();
        setGraphData(data);
        setError(null);
      } catch (err) {
        setError(`Failed to load graph: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error loading graph:', err);
      } finally {
        setLoading(false);
      }
    }
    initAndLoad();
  }, []);
  
  // Render graph when data changes
  useEffect(() => {
    if (!svgRef.current || !graphData || loading) return;
    
    renderGraph();
  }, [graphData, loading, svgWidth, svgHeight]);
  
  const renderGraph = () => {
    if (!svgRef.current || !graphData) return;
    
    // Clear previous rendering
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Skip if no data
    if (graphData.nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    
    // Create the main container
    const container = svg.append('g');
    
    // Define zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    
    // Apply zoom to SVG
    svg.call(zoom as any);
    
    // Center the view initially
    svg.call(
      zoom.transform as any,
      d3.zoomIdentity.translate(svgWidth / 2, svgHeight / 2).scale(0.8)
    );
    
    // Prepare the force simulation
    const simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id).distance(80)) // Increased distance for better visibility
      .force('charge', d3.forceManyBody().strength(-150)) // Stronger repulsion
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(40)); // Increased collision radius
    
    // Define node scale based on frequency
    const frequencyExtent = d3.extent(graphData.nodes, d => d.frequency) as [number, number];
    const nodeScale = d3.scaleLinear()
      .domain(frequencyExtent)
      .range([5, 15]);
    
    // Define edge scale based on weight
    const weightExtent = d3.extent(graphData.edges, d => d.weight) as [number, number];
    const edgeScale = d3.scaleLinear()
      .domain(weightExtent)
      .range([1, 5]);
    
    // Add console log to check edges data
    console.log('Rendering graph with edges:', graphData.edges.length);
    if (graphData.edges.length > 0) {
      console.log('Sample edge:', graphData.edges[0]);
    }
    
    // Create edges
    const links = container.append('g')
      .selectAll('line')
      .data(graphData.edges)
      .enter()
      .append('line')
      .attr('stroke', d => d.id.includes('semantic') ? '#5a9' : '#999') // Differentiate semantic edges
      .attr('stroke-opacity', 0.8) // Increased opacity
      .attr('stroke-width', d => edgeScale(d.weight));
    
    // Create nodes
    const nodes = container.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragging)
        .on('end', dragEnded) as any
      );
    
    // Add circles to nodes
    nodes.append('circle')
      .attr('r', d => nodeScale(d.frequency))
      .attr('fill', '#69b3a2')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
    
    // Add text labels to nodes
    nodes.append('text')
      .text(d => d.text)
      .attr('dx', 12)
      .attr('dy', '.35em')
      .style('font-size', '10px')
      .style('fill', '#333');
    
    // Add tooltips
    nodes.append('title')
      .text(d => `${d.text}\nFrequency: ${d.frequency}\nLast selected: ${new Date(d.lastSelected).toLocaleString()}`);
    
    // Update positions on simulation tick
    simulation.nodes(graphData.nodes as any).on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      nodes
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    
    // Setup link forces
    (simulation.force('link') as d3.ForceLink<any, any>)
      .links(graphData.edges as any);
    
    // Drag functions
    function dragStarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragging(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };
  
  // This would be called by a refresh button
  const refreshGraph = async () => {
    setLoading(true);
    try {
      // Ensure DB initialized before refresh
      await knowledgeGraphService.initialize();
      const data = await knowledgeGraphService.getGraph();
      setGraphData(data);
      setError(null);
    } catch (err) {
      setError(`Failed to refresh graph: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error refreshing graph:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Share graph by uploading to Firebase and opening the public URL
  const shareGraph = async () => {
    if (!graphData) return;
    try {
      const docRef = await addDoc(collection(db, 'graphs'), {
        nodes: graphData.nodes,
        edges: graphData.edges,
        createdAt: new Date().toISOString()
      });
      const publicUrl = `${FIREBASE_HOSTING_URL}/view.html?id=${docRef.id}`;
      window.open(publicUrl, '_blank');
    } catch (error) {
      console.error('Error sharing graph:', error);
      alert('Failed to share graph: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading knowledge graph...</div>;
  }
  
  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
        <button 
          onClick={refreshGraph}
          className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs">
          Retry
        </button>
      </div>
    );
  }
  
  if (graphData && graphData.nodes.length === 0) {
    return (
      <div className="text-gray-500 text-center p-4">
        Your knowledge graph is empty. Start exploring content to build your graph!
      </div>
    );
  }
  
  return (
    <div className={`knowledge-graph-container ${fullScreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {fullScreen && (
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={() => window.close()}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded">
            Close
          </button>
        </div>
      )}
      
      <svg 
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        className="border border-gray-200 rounded bg-gray-50"
      />
      
      <div className="flex space-x-2 mt-2">
        <button 
          onClick={refreshGraph}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
          Refresh Graph
        </button>
        <button
          onClick={shareGraph}
          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
          Share Graph
        </button>
        {!fullScreen && (
          <button 
            onClick={() => {
              // Open in new tab
              const url = chrome.runtime.getURL('graph.html');
              chrome.tabs.create({ url });
            }}
            className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600">
            Open Fullscreen
          </button>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph; 