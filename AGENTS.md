<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Financial screens use one shared vocabulary: Revenue, Payments, Pay-In, Pay-Out, Cash In/Out, Cash Expected/Actual, Balance Cash, and Next Start Cash, so cashier and owner figures reconcile.
- Cash items carry a standard account (sales/other/payin/expense/payout) and automatic modules resolve their item via Account Mapping (mapFor + entry.source); reports must read entryAccount/entrySource, never hardcoded category ids — so stores can name their own COA.
