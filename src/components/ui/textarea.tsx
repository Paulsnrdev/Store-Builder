import { cn } from "@/lib/cn";
import { fieldBase } from "@/components/ui/input";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, className)} {...props} />;
}
