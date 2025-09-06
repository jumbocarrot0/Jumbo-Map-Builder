import interact from "interactjs";
import tokenData from '../data/tokenData';

import { Card, Col, Image } from 'react-bootstrap';

function removeSystemTile(event) {
    const target = event.target
    console.log(target)
    if (event.altKey) {
        target.remove()
    }
}

export function GalaxyTokenPlacer(props) {

    const unusedTokensBinPosition = { x: 0, y: 0 }
    const tokensPool = []

    // Populate galaxy tokens pool
    for (const key of Object.keys(tokenData)) {
        tokensPool.push(
            <Col className='p-0' key={key}>
                <Card className='m-1 border-2 p-2' border="light">
                    <Image
                        className='galaxyToken z-3 tokenPool grabbable'
                        src={`/tokens/${tokenData[key].src}`}
                        token-id={key}
                    />
                    {/* <div className="position-absolute bottom-0 start-10">{tokenData[key].name}</div> */}
                </Card>
            </Col>
        )
    }

    // Unused Tokens Selector
    {
        const unusedTokensBin = interact('#unusedTokensBin')
        unusedTokensBin.resizable({
            edges: { top: true, left: true, bottom: true, right: true },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent'
                })
            ],
            listeners: {
                move: function (event) {
                    unusedTokensBinPosition.x = (parseFloat(unusedTokensBinPosition.x) || 0) + event.deltaRect.right
                    unusedTokensBinPosition.y = (parseFloat(unusedTokensBinPosition.y) || 0) + event.deltaRect.bottom

                    Object.assign(event.target.style, {
                        width: `${event.rect.width}px`,
                        height: `${event.rect.height}px`,
                        transform: `translate(${unusedTokensBinPosition.x}px, ${unusedTokensBinPosition.y}px)`
                    })

                    Object.assign(event.target.dataset, unusedTokensBinPosition)
                }
            }
        })
        unusedTokensBin.draggable({
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
                    unusedTokensBinPosition.x += event.dx
                    unusedTokensBinPosition.y += event.dy

                    event.target.style.transform =
                        `translate(${unusedTokensBinPosition.x}px, ${unusedTokensBinPosition.y}px)`
                },
            }
        })
    }

    // Galaxy Tokens Placer
    {
        let singleTileSelect = false;
        let systemPoolTileSelect = false;

        function rotateToken(event) {
            let rot = (parseFloat(event.target.getAttribute('data-rot')) || 0)
            console.log(event.code)
            if (event.code === "KeyE") {
                rot += 60
            }
            if (event.code === "KeyQ") {
                rot -= 60
            }
            rot = rot % 360
            event.target.setAttribute('data-rot', rot)

            // Update transform style
            const target = event.target
            const x = (parseFloat(target.getAttribute('data-x')) || 0)
            const y = (parseFloat(target.getAttribute('data-y')) || 0)
            console.log(target, x, y)
            target.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%)) rotate(${rot}deg)`
        }

        function removeToken(event) {
            const target = event.target
            if (event.altKey) {
                target.remove()
                singleTileSelect = false
            }
        }

        const galaxyTokens = interact('.galaxyToken')
        galaxyTokens.draggable({
            modifiers: [
            ],
            listeners: {
                start(event) {
                    const target = event.target
                    target.setAttribute("tabindex", -1)
                    target.addEventListener("keydown", rotateToken)

                    console.log(event)

                    if (target.classList.contains("tokenPool")) {
                        let { x, y } = target

                        x += (unusedTokensBinPosition.x - props.mapPosition.x)
                        y += (unusedTokensBinPosition.y - props.mapPosition.y)

                        console.log(x, y)

                        const clonedElement = target.cloneNode(true);
                        clonedElement.classList.remove("z-1")
                        clonedElement.classList.add("z-3")
                        const card = target.parentElement
                        if (card) {
                            card.appendChild(clonedElement);
                        }
                        const container = document.querySelector("#map");
                        container.appendChild(target);
                        target.style.position = 'absolute'

                        // translate the element
                        target.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%)) rotate(0deg)`
                        // update the position attributes
                        target.setAttribute('data-x', x)
                        target.setAttribute('data-y', y)
                        systemPoolTileSelect = true;
                        singleTileSelect = true;

                        // Add remove on alt click functionality

                        target.addEventListener("click", removeToken)

                    } else {
                        target.classList.remove("z-1")
                        target.classList.add("z-3")
                        systemPoolTileSelect = false;
                        if (event.shiftKey) {
                            singleTileSelect = false;
                        } else {
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
                        const rot = (parseFloat(event.target.getAttribute('data-rot')) || 0)

                        // translate the element
                        target.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%)) rotate(${rot}deg)`

                        // update the position attributes
                        target.setAttribute('data-x', x)
                        target.setAttribute('data-y', y)
                    } else {
                        // props.mapPosition.x += event.dx
                        // props.mapPosition.y += event.dy

                        // const map = document.querySelector("#map");
                        // map.style.transform =
                        //   `translate(${props.mapPosition.x}px, ${props.mapPosition.y}px)`
                    }
                },
                end(event) {
                    const target = event.target
                    target.removeEventListener("keydown", rotateToken)
                    if (singleTileSelect) {

                        target.classList.remove("z-3");
                        target.classList.add("z-1");
                        target.classList.remove("tokenPool");
                    }
                }
            }
        })
    }

    return (
        <div id="unusedTokensBin" className='z-2 p-3 position-absolute overflow-y-auto overflow-x-hidden rounded border border-light border-5'
            style={{
                bottom: "0px",
                right: "20px",
                width: "50vw",
                height: "30vh",
                maxWidth: "70vw",
                maxHeight: "100vh",
                backgroundColor: "rgba(255, 255, 255, 0.5)"
            }}>
            <div className='row row-cols-auto'>
                {tokensPool}
            </div>
        </div>
    )
}