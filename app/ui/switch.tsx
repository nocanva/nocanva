"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

export function Switch(props: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root className="ui-switch" data-slot="switch" {...props}>
      <SwitchPrimitive.Thumb className="ui-switch-thumb" data-slot="switch-thumb" />
    </SwitchPrimitive.Root>
  );
}
