const MAX_CLICK_DRAG_PX = 5

// React Three Fiber reports how far the pointer moved between press and release, so a
// camera drag that ends over a piece is not mistaken for a click on it.
export const isClick = (event: { delta: number }) => event.delta <= MAX_CLICK_DRAG_PX
