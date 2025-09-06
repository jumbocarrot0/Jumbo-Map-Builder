import React, { useState, useEffect } from 'react';
import interact from "interactjs";
import tileData, { hyperlanes } from '../data/tileData';

import { Card, Col, Image, Form } from 'react-bootstrap';

function removeSystemTile(event) {
  const target = event.target
  console.log(target)
  if (event.altKey) {
    target.remove()
  }
}

export function addSystemTile(id, left, top, mapTiles) {
    let rotation = 0
    // if (!Object.keys(tileData).includes(id)) {
    //     if (Object.keys(hyperlanes).includes(id.slice(0, -1))) {
    //         rotation = id.at(-1)
    //         id = id.slice(0, -1)
    //     } else {
    //         return
    //     }
    // }
    console.log(`Adding ${id} at (${left}, ${top}) with ${rotation}`)
    const map = document.getElementById("map");
    const tileElement = document.createElement('img')
    tileElement.className = "systemTile z-0 grabbable position-absolute"
    tileElement.src = `/tiles/ST_${id}.webp`
    tileElement.style.left = `${left * 150 + 50}px`;
    tileElement.style.top = `${top * 87 + 43.5}px`;
    tileElement.style.transform = `rotate(${rotation * 60}deg)`
    tileElement.setAttribute("width", "200px");
    tileElement.setAttribute("system-id", id);
    tileElement.addEventListener("click", removeSystemTile)
    console.log(tileElement);
    map.appendChild(tileElement);
    mapTiles[id] = { left: left, top: top, element: tileElement };
}

export function SystemTilePlacer(props) {

    const unusedTilesBinPosition = { x: 0, y: 0 }
    const systemPool = []
    const [systemTileFilter, setSystemTileFilter] = useState("");

    // Populate system tiles pool
    for (const key of Object.keys(tileData)) {
        if (
            !key.includes(systemTileFilter.toLowerCase()) &&
            !tileData[key].planets.some(planet => planet.name.toLowerCase().includes(systemTileFilter.toLowerCase())) &&
            !tileData[key].wormhole.some(wormhole => wormhole.toLowerCase().includes(systemTileFilter.toLowerCase())) &&
            !(tileData[key].anomaly ?? []).some(anomaly => anomaly.toLowerCase().includes(systemTileFilter.toLowerCase()))
        ) {
            continue
        }
        systemPool.push(
            <Col className='p-0' key={key}>
                <Card className='m-1 border-2 p-2' border="light">
                    <Image
                        className='systemTile z-3 systemPool grabbable'
                        width="200px"
                        src={`/tiles/ST_${key}.webp`}
                        system-id={key}
                    />
                    <div className="position-absolute bottom-0 start-10">{key}</div>
                </Card>
            </Col>
        )
    }

    // Unused System Tiles Menu
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
                    unusedTilesBinPosition.x = (parseFloat(unusedTilesBinPosition.x) || 0) + event.deltaRect.right
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

    // System Tiles Placer
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
                                newX = Math.round((x - props.mapPosition.x) / 150) * 150
                                newY = Math.round((y - props.mapPosition.y) / 174) * 174
                            } else {
                                newX = Math.round((x - props.mapPosition.x) / 150) * 150 + 32
                                newY = Math.round((y - props.mapPosition.y) / 174) * 174 - 32
                            }

                            // Modulo works unexpectedly with negative numbers, this makes it work as intended.
                            if (((newX % 300) + 300) % 300 < 150) {
                                if (!systemPoolTileSelect) {
                                    newX += props.mapPosition.x
                                    newY += props.mapPosition.y
                                }
                                return {
                                    x: newX,
                                    y: newY + 174 / 4,
                                    range: Infinity
                                }
                            } else {
                                if (!systemPoolTileSelect) {
                                    newX += props.mapPosition.x
                                    newY += props.mapPosition.y
                                }
                                return {
                                    x: newX,
                                    y: newY - 174 / 4,
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

                    // If system tile is in the unused pool of tiles
                    if (target.classList.contains("systemPool")) {
                        let { x, y } = target

                        x += unusedTilesBinPosition.x
                        y += unusedTilesBinPosition.y

                        console.log(x, y)

                        const clonedElement = target.cloneNode(true);
                        clonedElement.classList.remove("z-0")
                        clonedElement.classList.add("z-3")
                        const card = target.parentElement
                        card && card.appendChild(clonedElement);
                        const container = document.querySelector("#map");
                        container.appendChild(target);
                        target.style.position = 'absolute'

                        target.style.left = `${x}px`;
                        target.style.top = `${y}px`
                        systemPoolTileSelect = true;
                        singleTileSelect = true;

                        // Add remove on alt click functionality
                    } else { // Otherwise, it is a tile already placed on the map
                        systemPoolTileSelect = false;
                        if (event.shiftKey) {
                            singleTileSelect = false;
                        } else {
                            target.classList.remove("z-0")
                            target.classList.add("z-3")
                            singleTileSelect = true;
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

                        // update the position attributes
                        target.setAttribute('data-x', x)
                        target.setAttribute('data-y', y)
                    } else {
                        // mapPosition.x += event.dx
                        // mapPosition.y += event.dy

                        // const map = document.querySelector("#map");
                        // map.style.transform =
                        //     `translate(${mapPosition.x}px, ${mapPosition.y}px)`
                    }
                },
                end(event) {
                    if (singleTileSelect) {
                        const target = event.target
                        const x = (parseFloat(target.getAttribute('data-x')) || 0) + parseFloat(target.style.left)
                        const y = (parseFloat(target.getAttribute('data-y')) || 0) + parseFloat(target.style.top)
                        target.classList.remove("z-3");
                        target.classList.add("z-0");
                        target.classList.remove("systemPool");
                        const coords = {
                            left: Math.round((x - 50) / 150),
                            top: Math.round((y - 174 / 4) / 87)
                        }
                        console.log(coords)
                        for (const key in props.mapTiles) {
                            if (props.mapTiles[key].left === coords.left && props.mapTiles[key].top === coords.top) {
                                if (props.mapTiles[key].element === target) continue
                                (props.mapTiles[key].element ?? document.getElementById("starting_tile")).remove();
                                delete props.mapTiles[key];
                            }
                        }

                        addSystemTile(target.getAttribute('system-id'), coords.left, coords.top, props.mapTiles)
                        target.remove()

                        console.log(target)
                        console.log(props.mapTiles)
                    }
                }
            }
        })
    }

    return (<div id="unusedTilesBin" className='z-2 p-3 position-absolute overflow-y-auto overflow-x-hidden rounded border border-light border-5'
        style={{
            top: "0px",
            right: "20px",
            width: "50vw",
            height: "50vh",
            maxWidth: "70vw",
            maxHeight: "100vh",
            backgroundColor: "rgba(255, 255, 255, 0.5)"
        }}>
        <Form.Control type="text" placeholder="Filter System Tiles" value={systemTileFilter} onChange={
            (e) => {
                if (!/[^ A-Za-z0-9]/.test(e.target.value)) {
                    setSystemTileFilter(e.target.value)
                }
            }
        } />
        <div className='row row-cols-auto'>
            {systemPool}
        </div>
    </div>)
}