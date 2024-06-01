import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import interact from "interactjs";
import $ from "jquery";
import tileData from './data/tileData';

import { Button, Card, Container, Col, Image } from 'react-bootstrap';

import domtoimage from 'dom-to-image';
import { saveAs } from 'file-saver';



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

  const systemPool = []
  const mapTiles = {
    "18": { left: 1, top: 4 }
  }
  const unusedTilesBinPosition = { x: 0, y: 0 }
  const mapPosition = { x: 0, y: 0 }

  function getCentralTile() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

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
      centralCoord.top += 1
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
      rings = Math.max(rings, getRingOfTile({ left: centralCoord.left - left, top: centralCoord.top - top }))
    }

    return rings
  }

  function getMapString() {
    // Find the central system and the number of rings out from it
    const centralCoord = getCentralTile()
    const rings = getNumberOfRings()

    // Create a blank map string with -1's full for the necessary number of rings
    let mapString = Array(rings * (rings + 1) / 2 * 6 + 1).fill("-1")

    // Checks through each system and finds the corresponding index it will be placed in the map string
    // (As opposed to finding the corresponding coordinate for each index and finding if there is a hex on that coordinate.)
    for (const systemID of Object.keys(mapTiles)) {
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

    console.log(mapString.join(' '))
    return mapString.join(' ')

  }

  for (const key of Object.keys(tileData)) {
    systemPool.push(
      <Col className='p-0' key={key}>
        <Card className='m-1 border-2 p-2' border="light">
          <Image
            className='systemTile z-2 systemPool grabbable'
            width="200px"
            src={`/tiles/ST_${key}.webp`}
            system-id={key}
          />
          <div className="position-absolute bottom-0 start-10">{key}</div>
        </Card>
      </Col>
    )
  }

  {
    const unusedTilesBin = interact('#unusedTilesBin')
    unusedTilesBin.resizable({
      edges: { top: true, left: true, bottom: true, right: true },
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent'
        })
      ],
      listeners: {
        move: function (event) {
          unusedTilesBinPosition.x = (parseFloat(unusedTilesBinPosition.x) || 0) + event.deltaRect.left / 2 + event.deltaRect.right / 2
          unusedTilesBinPosition.y = (parseFloat(unusedTilesBinPosition.y) || 0) + event.deltaRect.top

          Object.assign(event.target.style, {
            width: `${event.rect.width}px`,
            height: `${event.rect.height}px`,
            transform: `translate(${unusedTilesBinPosition.x}px, ${unusedTilesBinPosition.y}px)`
          })

          Object.assign(event.target.dataset, unusedTilesBinPosition)
        }
      }
    })
    unusedTilesBin.draggable({
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent'
        })
      ],
      listeners: {
        start(event) {
          console.log(event.type, event.target)
        },
        move(event) {
          unusedTilesBinPosition.x += event.dx
          unusedTilesBinPosition.y += event.dy

          event.target.style.transform =
            `translate(${unusedTilesBinPosition.x}px, ${unusedTilesBinPosition.y}px)`
        },
      }
    })
  }

  // {
  //   const mapElement = interact('#map')
  //   mapElement.draggable({
  //     modifiers: [
  //       interact.modifiers.restrictRect({
  //         restriction: 'parent'
  //       })
  //     ],
  //     listeners: {
  //       start(event) {
  //         console.log(event.type, event.target)
  //       },
  //       move(event) {
  //         mapPosition.x += event.dx
  //         mapPosition.y += event.dy

  //         event.target.style.transform =
  //           `translate(${mapPosition.x}px, ${mapPosition.y}px)`
  //       },
  //     }
  //   })
  // }

  {
    let singleTileSelect = false;
    let systemPoolTileSelect = false;

    const systemTiles = interact('.systemTile')
    systemTiles.draggable({
      modifiers: [
        interact.modifiers.snap({
          targets: [
            function (
              // the x and y page coordinates,
              x,
              y
            ) {

              if (!singleTileSelect) {
                return {
                  x: x,
                  y: y,
                  range: Infinity
                }
              }

              // let newy = Math.round(y / 87) * 87
              let newX;
              let newY;
              if (systemPoolTileSelect) {
                newX = Math.round((x - mapPosition.x) / 150) * 150
                newY = Math.round((y - mapPosition.y) / 174) * 174
              } else {
                newX = Math.round((x - mapPosition.x) / 150) * 150 + 32
                newY = Math.round((y - mapPosition.y) / 174) * 174 + 174 / 2 - 17
              }

              // Modulo works unexpectedly with negative numbers, this makes it work as intended.
              if (((newX % 300) + 300) % 300 < 150) {
                if (!systemPoolTileSelect) {
                  newX += mapPosition.x
                  newY += mapPosition.y
                }
                return {
                  x: newX,
                  y: newY - 174 / 4,
                  range: Infinity
                }
              } else {
                if (!systemPoolTileSelect) {
                  newX += mapPosition.x
                  newY += mapPosition.y
                }
                return {
                  x: newX,
                  y: newY + 174 / 4,
                  range: Infinity
                }
              }
            },
          ],
          relativePoints: [
            { x: 0.5, y: 0.5 },   // to the center
          ]
        })
      ],
      listeners: {
        start(event) {
          const target = event.target

          console.log(event)

          if (target.classList.contains("systemPool")) {
            let { x, y } = target

            x += unusedTilesBinPosition.x
            y += unusedTilesBinPosition.y

            console.log(x, y)

            const clonedElement = target.cloneNode(true);
            clonedElement.classList.remove("z-0")
            clonedElement.classList.add("z-2")
            const card = target.parentElement
            card && card.appendChild(clonedElement);
            const container = document.querySelector("#map");
            container.appendChild(target);
            target.style.position = 'absolute'

            target.style.left = `${x}px`;
            target.style.top = `${y}px`
            systemPoolTileSelect = true;
            singleTileSelect = true;
          } else {
            target.classList.remove("z-0")
            target.classList.add("z-2")
            systemPoolTileSelect = false;
            if (event.shiftKey) {
              singleTileSelect = true;
            } else {
              singleTileSelect = false;
            }
          }


        },
        move(event) {
          const target = event.target
          if (singleTileSelect) {
            // keep the dragged position in the data-x/data-y attributes
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

            // translate the element
            target.style.transform = `translate(${x}px, ${y}px)`

            // update the posiion attributes
            target.setAttribute('data-x', x)
            target.setAttribute('data-y', y)
          } else {
            mapPosition.x += event.dx
            mapPosition.y += event.dy

            const map = document.querySelector("#map");
            map.style.transform =
              `translate(${mapPosition.x}px, ${mapPosition.y}px)`
          }
        },
        end(event) {
          if (singleTileSelect) {
            const target = event.target
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + parseFloat(target.style.left)
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + parseFloat(target.style.top)
            target.classList.remove("z-2");
            target.classList.add("z-0");
            target.classList.remove("systemPool");
            mapTiles[target.getAttribute('system-id')] = {
              left: Math.round((x - 50) / 150),
              top: Math.round((y - 174 / 4) / 87)
            }
            console.log(target)
            console.log(mapTiles)
          }
        }
      }
    })
  }

  return (
    <>
      <Button onClick={downloadImage}>
        Export
      </Button>
      <Button onClick={getMapString}>
        Print Map String
      </Button>
      <div id="map" className='position-absolute'>
        <Image
          className='systemTile z-0 grabbable position-absolute'
          style={{ left: 200, top: 391.5 }}
          width="200px"
          src={`/tiles/ST_${18}.webp`}
        />
      </div>

      <div id="unusedTilesBin" className='z-1 p-3 position-absolute overflow-y-auto overflow-x-hidden rounded border border-light border-5'
        style={{
          top: "0px",
          right: "20px",
          width: "50vw",
          height: "50vh",
          maxWidth: "70vw",
          maxHeight: "100vh",
          backgroundColor: "rgba(255, 255, 255, 0.5)"
        }}>
        <div className='row row-cols-auto'>
          {systemPool}
        </div>
      </div>
    </>
  )
}

export default App
