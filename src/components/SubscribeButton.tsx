import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";

interface SubscribeButtonProps {
  creatorUserId: string;
  className?: string;
}

const SubscribeButton = ({ creatorUserId, className }: SubscribeButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Don't show subscribe button for own content
  const isOwnContent = user?.id === creatorUserId;

  useEffect(() => {
    if (!user || isOwnContent) return;
    supabase
      .from("subscriptions")
      .select("id")
      .eq("subscriber_id", user.id)
      .eq("creator_id", creatorUserId)
      .maybeSingle()
      .then(({ data }) => setSubscribed(!!data));
  }, [user, creatorUserId, isOwnContent]);

  const handleClick = async () => {
    if (!user) {
      toast.info("Sign in to subscribe");
      navigate("/auth");
      return;
    }
    setLoading(true);
    if (subscribed) {
      await supabase
        .from("subscriptions")
        .delete()
        .eq("subscriber_id", user.id)
        .eq("creator_id", creatorUserId);
      setSubscribed(false);
      toast.success("Unsubscribed");
    } else {
      await supabase
        .from("subscriptions")
        .insert({ subscriber_id: user.id, creator_id: creatorUserId });
      setSubscribed(true);
      toast.success("Subscribed!");
    }
    setLoading(false);
  };

  if (isOwnContent) return null;

  return (
    <Button
      size="sm"
      disabled={loading}
      onClick={handleClick}
      className={
        subscribed
          ? "rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 " + (className ?? "")
          : "rounded-full bg-gradient-gold text-primary-foreground hover:opacity-90 " + (className ?? "")
      }
    >
      {subscribed ? (
        <>
          <BellOff size={14} className="mr-1.5" /> Subscribed
        </>
      ) : (
        <>
          <Bell size={14} className="mr-1.5" /> Subscribe
        </>
      )}
    </Button>
  );
};

export default SubscribeButton;
