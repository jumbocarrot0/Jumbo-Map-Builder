import './App.css'

import React, { useState, useEffect } from 'react';
import interact from "interactjs";
import $ from "jquery";

import { Button, Card, Container, Col, Image, Form } from 'react-bootstrap';

import domtoimage from 'dom-to-image';
import { saveAs } from 'file-saver';

import { SystemTilePlacer, addSystemTile } from "./components/systemTilePlacer"
import { GalaxyTokenPlacer } from './components/galaxyTokenPlacer';
import { Controls } from './components/controls';


/**
 * Downloads an image of the map to the user's computer.
 * @returns {Promise<void>} null
 */
async function downloadImage() {

  domtoimage.toBlob(document.getElementById("map"), { width: 3000, height: 3000 })
    .then(function (blob) {
      saveAs(blob, 'my-map.png');
    });

}
function App() {

  const [mapStringInput, setMapStringInput] = useState("");

  const mapTiles = {
    "18": { left: 1, top: 4 }
  }
  const mapPosition = { x: 0, y: 0 }

  function getCentralTile() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    console.log(mapTiles)
    for (const coord of Object.values(mapTiles)) {
      console.log(coord)
      if (coord.left < minX) {
        minX = coord.left
      }
      if (coord.top < minY) {
        minY = coord.top
      }
      if (coord.left > maxX) {
        maxX = coord.left
      }
      if (coord.top > maxY) {
        maxY = coord.top
      }
    }

    const centralCoord = { left: Math.round((maxX + minX) / 2), top: Math.round((maxY + minY) / 2) }
    if ((centralCoord.left + centralCoord.top) % 2 === 0) {
      // centralCoord.top += 1
    }

    return centralCoord
  }

  // Coord should be relative to (0, 0)
  function getRingOfTile(coord) {
    const { left, top } = coord
    // Check if in the 'vertical pillar' of the hex ring, which means ring number is just horizontal distance
    if (Math.abs(left) > Math.abs(top)) {
      return Math.abs(left)
    } else {
      return (Math.abs(left) + Math.abs(top)) / 2
    }
  }

  function getNumberOfRings() {
    let rings = 0
    const centralCoord = getCentralTile()

    for (const coord of Object.values(mapTiles)) {
      console.log(coord)
      const { left, top } = coord
      // Every move away from the center adds a difference of 2 to the coordinate sum.
      const ring = getRingOfTile({ left: centralCoord.left - left, top: centralCoord.top - top })
      console.log(ring)
      rings = Math.max(rings, ring)
    }

    return rings
  }

  function clearMap() {
    const map = document.querySelector("#map");
    while (map.firstChild) {
      map.removeChild(map.lastChild)
    }
    for (const key of Object.keys(mapTiles)) {
      delete mapTiles[key]
    }
  }

  function getMapString() {
    // Find the central system and the number of rings out from it
    const centralCoord = getCentralTile()
    const rings = getNumberOfRings()

    // Create a blank map string with -1's full for the necessary number of rings
    let mapString = Array(rings * (rings + 1) / 2 * 6 + 1).fill("-1")

    console.log(mapTiles)

    // Checks through each system and finds the corresponding index it will be placed in the map string
    // (As opposed to finding the corresponding coordinate for each index and finding if there is a hex on that coordinate.)
    for (const systemID of Object.keys(mapTiles)) {
      if (systemID === "-1") continue;
      const { left, top } = mapTiles[systemID]

      const normalisedLeft = left - centralCoord.left // Big to the right, small to the left
      const normalisedTop = top - centralCoord.top  // Big down, small up

      const ring = getRingOfTile({ left: normalisedLeft, top: normalisedTop });

      let index;

      // Central position check
      if (ring === 0) {
        index = 0;
      } else {

        // Assuming its not the central hex, instead find the index by spitting the map into 5 "sections"
        // 2 sections are the 'triangles' that extend left and right from the center hex, so the right would include indices 2, 3, 9, 10, 11, etc.;
        // and the left indices 5, 6, 15, 16, 17, etc.
        // Any hexes below the central tile that are not in these triangles make up the third section (includes indices 4, 12, 13, 14, 26, 27, 28, 29, 30, etc.).
        // The final two sections are those above the central tile not in these triangles, split between those to the left of the central tile (includes indices 18, 35, 36, etc.);
        // and those to the right or aligned horizontally with the central tiles (includes indices 1, 7, 8, 19, 20, 21, etc.).

        // Set index to be minimum possible value in the given ring
        index = ring * (ring - 1) / 2 * 6 + 1

        // Check if in the 'vertical pillar' of the hex ring, which makes index a bit easier
        if (Math.abs(normalisedLeft) >= Math.abs(normalisedTop)) {
          if (normalisedLeft < 0) {
            index += ring * 4.5 - normalisedTop / 2
          } else {
            index += ring * 1.5 + normalisedTop / 2
          }
        } else {
          if (normalisedTop < 0) {
            if (normalisedLeft < 0) {
              index += ring * 6 + normalisedLeft
            } else {
              index += normalisedLeft
            }
          } else {
            index += ring * 3 - normalisedLeft
          }
        }
      }

      mapString[index] = systemID
      console.log(index, systemID, ring)
    }

    if (mapString[0] === "18") {
      mapString.shift()
    } else {
      mapString[0] = `{${mapString[0]}}`
    }

    console.log(mapString.join(' '))
    return mapString.join(' ')

  }

  function loadMapString() {
    console.log(mapStringInput.split(' '))
    clearMap();
    const map = document.getElementById("map");

    const mapString = mapStringInput.split(' ')
    if (mapString.at(0).includes("{")) {
      mapString[0] = mapString[0].slice(1, -1)
    } else {
      mapString.unshift("18")
    }

    let currentRing = 0;
    const centralCoord = { left: 1, top: 4 }
    let left = 1;
    let top = 4;

    console.log(mapString)

    for (let index = 0; index < mapString.length; index++) {
      // Tricky maths here, the number of tiles in the current ring increments by 6 every new ring (minus "ring" 0 which contains just one tile)
      // So we need to account for that, as well as the number of tiles in each previous ring combined.
      // This corresponds to the triangle numbers, so we can use the formula for that [n(n+1)/2] and multiply it by 6 to get this condition below
      if (index > currentRing * (currentRing + 1) * 3) {
        currentRing++
        left = centralCoord.left
        top = centralCoord.top - currentRing * 2
      }
      const ring_index = index - currentRing * (currentRing - 1) * 3 - 1 // The index of the tile in content w/ the ring, where 0 is topmost and goes clockwise.
      console.log(index, ring_index, currentRing, mapString[index])
      if (ring_index === 0 || currentRing === 0) { }
      else if (ring_index / currentRing <= 1) {
        top++
        left++
      }
      else if (ring_index / currentRing <= 2) {
        top += 2
      }
      else if (ring_index / currentRing <= 3) {
        top++
        left--
      }
      else if (ring_index / currentRing <= 4) {
        top--
        left--
      }
      else if (ring_index / currentRing <= 5) {
        top -= 2
      }
      else if (ring_index / currentRing <= 6) {
        top--
        left++
      } else {
        console.log("something weird happened");
      }

      const systemID = mapString[index];
      addSystemTile(systemID, left, top, mapTiles)
    }
  }

  // Map dragger
  {
    let singleTileSelect = false;
    const galaxyTokens = interact('#root')
    galaxyTokens.draggable({
      modifiers: [
      ],
      listeners: {
        start(event) {
          const target = event.target
          console.log(event)

          if (target.classList.contains("tokenPool")) {
          } else {
            if (event.altKey) {
              singleTileSelect = false;
            } else if (event.shiftKey) {
              singleTileSelect = false;
            } else {
              singleTileSelect = true;
            }
          }
        },
        move(event) {
          const target = event.target
          if (!singleTileSelect) {
            mapPosition.x += event.dx
            mapPosition.y += event.dy

            const map = document.querySelector("#map");
            map.style.transform =
              `translate(${mapPosition.x}px, ${mapPosition.y}px)`
          }
        },
        end(event) {
          const target = event.target
        }
      }
    })
  }

  useEffect(() => {
    if (!document.getElementById("map").firstChild) {
      addSystemTile("18", 0, 0, mapTiles);
    }
  }, [])

  return (
    <>

      <div id="map" className='position-absolute' style={{ left: "0px", top: "0px" }}>
      </div>

      <Button onClick={downloadImage}>
        Export
      </Button>
      <Button onClick={getMapString}>
        Print Map String
      </Button>
      <Form.Control type="text" placeholder="Enter Map String" value={mapStringInput} onChange={
        (e) => {
          if (!/[^ A-Za-z0-9\-\{\}]/.test(e.target.value)) {
            setMapStringInput(e.target.value)
          }
        }
      } />
      <Button onClick={loadMapString}>
        Load Map String
      </Button>

      <SystemTilePlacer mapPosition={mapPosition} mapTiles={mapTiles} />

      <GalaxyTokenPlacer mapPosition={mapPosition} />

      <Controls/>
    </>
  )
}

export default App
