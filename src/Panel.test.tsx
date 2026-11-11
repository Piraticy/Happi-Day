import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { useState } from 'react'
import Panel from './Panel'

function Example() {
  const [open, setOpen] = useState(false)
  return <><button onClick={() => setOpen(true)}>Open options</button>{open && <Panel title="Options" onClose={() => setOpen(false)}><p>Panel content</p></Panel>}</>
}

it('opens a titled modal and restores focus after Escape', () => {
  render(<Example />)
  const trigger = screen.getByRole('button', { name: 'Open options' })
  trigger.focus(); fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Options' })
  expect(dialog).toHaveAttribute('open')
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

it('keeps content clicks inside and closes from the backdrop', () => {
  render(<Example />)
  fireEvent.click(screen.getByRole('button', { name: 'Open options' }))
  fireEvent.click(screen.getByText('Panel content'))
  expect(screen.getByRole('dialog')).toBeVisible()
  fireEvent.click(screen.getByRole('dialog'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('Escape closes only the top panel when dialogs are nested', () => {
  function Nested() {
    const [inner, setInner] = useState(true)
    const [outer, setOuter] = useState(true)
    return outer && <Panel title="Outer" onClose={() => setOuter(false)}>{inner && <Panel title="Inner" onClose={() => setInner(false)}>A note</Panel>}</Panel>
  }
  render(<Nested />)
  fireEvent(screen.getByRole('dialog', { name: 'Inner' }), new Event('cancel', { bubbles: false, cancelable: true }))
  expect(screen.queryByRole('dialog', { name: 'Inner' })).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: 'Outer' })).toBeVisible()
})
