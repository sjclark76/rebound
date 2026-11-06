import { UndoToast } from "@/components/settings/undo-toast";

export default function WeightsLayout({ children }: LayoutProps<"/settings/equipment/[item]">) {
  return (
    <>
      {children}
      <UndoToast />
    </>
  );
}
