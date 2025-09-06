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

export function Controls(props) {

    const controlsPopupPosition = { x: 0, y: 0 }

    // Unused Tokens Selector
    {
        const controlsPopup = interact('#controlsPopup')
        controlsPopup.resizable({
            edges: { top: true, left: true, bottom: true, right: true },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent'
                })
            ],
            listeners: {
                move: function (event) {
                    controlsPopupPosition.x = (parseFloat(controlsPopupPosition.x) || 0) + event.deltaRect.left
                    controlsPopupPosition.y = (parseFloat(controlsPopupPosition.y) || 0) + event.deltaRect.bottom

                    Object.assign(event.target.style, {
                        width: `${event.rect.width}px`,
                        height: `${event.rect.height}px`,
                        transform: `translate(${controlsPopupPosition.x}px, ${controlsPopupPosition.y}px)`
                    })

                    Object.assign(event.target.dataset, controlsPopupPosition)
                }
            }
        })
        controlsPopup.draggable({
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
                    controlsPopupPosition.x += event.dx
                    controlsPopupPosition.y += event.dy

                    event.target.style.transform =
                        `translate(${controlsPopupPosition.x}px, ${controlsPopupPosition.y}px)`
                },
            }
        })
    }

    return (
        <div id="controlsPopup" className='z-2 p-3 position-absolute overflow-y-auto overflow-x-hidden rounded border border-light border-5 text-start'
            style={{
                bottom: "20px",
                left: "20px",
                width: "20vw",
                height: "10vh",
                maxWidth: "70vw",
                maxHeight: "100vh",
                backgroundColor: "rgba(0, 0, 0, 0.5)"
            }}>
                <p><strong>Shift + Left Click</strong> - Drag map</p>
                <p><strong>Alt + Left Click</strong> - Delete</p>
        </div>
    )
}