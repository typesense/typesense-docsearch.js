import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import React, { type JSX } from 'react';

import { CheckIcon } from '../../icons';

export function Menu({ ...props }: MenuPrimitive.Root.Props): JSX.Element {
  return <MenuPrimitive.Root {...props} />;
}

const MenuTrigger = React.forwardRef<
  HTMLButtonElement,
  MenuPrimitive.Trigger.Props
>(({ className, ...props }, ref): JSX.Element => {
  const cn = `DocSearch-Menu-Trigger${className ? ` ${className}` : ''}`;
  return <MenuPrimitive.Trigger className={cn} ref={ref} {...props} />;
});

Menu.Trigger = MenuTrigger;

type MenuPopupProps = MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Portal.Props, 'container'> &
  Pick<
    MenuPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'collisionBoundary' | 'side' | 'sideOffset'
  >;

function MenuPopup({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  collisionBoundary = 'clipping-ancestors',
  container,
  ...props
}: MenuPopupProps): JSX.Element {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Positioner
        className="DocSearch-Menu-Positioner"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionBoundary={collisionBoundary}
      >
        <MenuPrimitive.Popup className="DocSearch-Menu-Popup" {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

Menu.Popup = MenuPopup;

function MenuItem({
  className,
  ...props
}: MenuPrimitive.Item.Props): JSX.Element {
  const cn = `DocSearch-Menu-Item${className ? ` ${className}` : ''}`;
  return <MenuPrimitive.Item className={cn} {...props} />;
}

Menu.Item = MenuItem;

function MenuCheckboxItem({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props): JSX.Element {
  const cn = `DocSearch-Menu-Item DocSearch-Menu-CheckboxItem${className ? ` ${className}` : ''}`;
  return (
    <MenuPrimitive.CheckboxItem className={cn} {...props}>
      {/* Always rendered; CSS reveals it from the item's `data-checked` so
          checking and unchecking both animate. */}
      <span className="DocSearch-Menu-CheckboxItem-Indicator">
        <CheckIcon />
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

Menu.CheckboxItem = MenuCheckboxItem;
