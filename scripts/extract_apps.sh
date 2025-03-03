#!/bin/bash
# filepath: /workspaces/crmuo-home-ops/extract_apps.sh

# Setup directories for data persistence
data_dir="gh_search_data"
mkdir -p "$data_dir"

# Input/Output files
repos_file="$data_dir/repositories.csv"
results_file="kubernetes_apps.csv"

# Check if repositories file exists
if [[ ! -f "$repos_file" ]]; then
  echo "Error: Repositories file not found. Run find_repos.sh first."
  exit 1
fi

# Initialize results file if it doesn't exist
if [[ ! -f "$results_file" ]]; then
  echo "repository,namespace,app" > "$results_file"
fi

# Calculate date 6 months ago
six_months_ago=$(date -d "6 months ago" "+%Y-%m-%d" 2>/dev/null || date -v-6m "+%Y-%m-%d")

# Check rate limits and wait if needed (using core API limit)
check_rate_limits() {
  local rate_info=$(gh api /rate_limit --jq '.resources.core')
  local remaining=$(echo "$rate_info" | jq -r '.remaining')
  local reset_time=$(echo "$rate_info" | jq -r '.reset')
  local limit=$(echo "$rate_info" | jq -r '.limit')
  local current_time=$(date +%s)

  echo "GitHub API rate limit: $remaining/$limit remaining"

  if [ "$remaining" -le 50 ]; then
    local wait_time=$((reset_time - current_time + 5))
    echo "Rate limit running low. Waiting for $wait_time seconds until reset..."
    sleep $wait_time
    return 1
  fi
  return 0
}

# Function to check if repository was updated within the past 6 months
is_recently_updated() {
  local repo=$1
  echo "Checking last update for repository: $repo"

  # Get repository metadata
  local repo_info=$(gh api "repos/$repo" --jq '.pushed_at')
  local last_pushed=$(echo "$repo_info" | cut -d'T' -f1)

  # Compare dates
  if [[ "$last_pushed" > "$six_months_ago" || "$last_pushed" == "$six_months_ago" ]]; then
    echo "  Repository was updated on $last_pushed (after $six_months_ago)"
    return 0
  else
    echo "  Repository was last updated on $last_pushed (before $six_months_ago). Skipping."
    return 1
  fi
}

# Function to extract namespaces and apps from a repository
process_repository() {
  local repo=$1
  echo "Processing repository: $repo"

  # Check if repository was updated in the past 6 months
  if ! is_recently_updated "$repo"; then
    # Mark as inactive in the file (using alternate delimiter to avoid issues with slashes in repo names)
    sed -i "s|^$repo,pending|$repo,inactive|" "$repos_file"
    return 1
  fi

  # Get the contents of the kubernetes/apps directory
  contents_json=$(gh api "repos/$repo/contents/kubernetes/apps" 2>/dev/null)

  # Check if we got a valid response
  if [[ $(echo "$contents_json" | jq -r 'type') != "array" ]]; then
    echo "  No kubernetes/apps directory found or error accessing repository."
    # Mark as done but empty in the file (using alternate delimiter to avoid issues with slashes in repo names)
    sed -i "s|^$repo,pending|$repo,empty|" "$repos_file"
    return 1
  fi

  # Extract namespace directories
  namespaces=$(echo "$contents_json" | jq -r '.[] | select(.type == "dir") | .name')

  for ns in $namespaces; do
    echo "  Found namespace: $ns"

    # Get contents of the namespace directory
    ns_contents=$(gh api "repos/$repo/contents/kubernetes/apps/$ns" 2>/dev/null)

    # Check if we got a valid response
    if [[ $(echo "$ns_contents" | jq -r 'type') != "array" ]]; then
      continue
    fi

    # Extract app directories
    apps=$(echo "$ns_contents" | jq -r '.[] | select(.type == "dir") | .name')

    for app in $apps; do
      # Check if ks.yaml exists in this app directory
      if gh api "repos/$repo/contents/kubernetes/apps/$ns/$app/ks.yaml" &>/dev/null; then
        echo "    Found app: $app"
        # Add to results if not already there
        if ! grep -q "^\"$repo\",\"$ns\",\"$app\"$" "$results_file"; then
          echo "\"$repo\",\"$ns\",\"$app\"" >> "$results_file"
        fi
      fi
    done
  done

  # Mark as done in the file (using alternate delimiter to avoid issues with slashes in repo names)
  sed -i "s|^$repo,pending|$repo,done|" "$repos_file"
  return 0
}

# Process all pending repositories
echo "Starting to process repositories..."
total_repos=$(grep -c "pending" "$repos_file")
processed=0
active=0
inactive=0

# Read the CSV line by line (skipping header)
tail -n +2 "$repos_file" | while IFS=, read -r repo status; do
  if [[ "$status" == "pending" ]]; then
    # Check rate limits before processing
    check_rate_limits || continue

    # Process the repository
    if is_recently_updated "$repo"; then
      ((active++))
      if process_repository "$repo"; then
        echo "Successfully processed repository: $repo"
      else
        echo "Repository processed but no valid apps found: $repo"
      fi
    else
      ((inactive++))
    fi

    ((processed++))
    echo "Progress: $processed/$total_repos repositories processed ($active active, $inactive inactive)"

    # Use a conservative delay between repositories
    sleep 1
  fi
done

echo "Processing complete! Found data has been saved to $results_file"
echo "Processed $processed out of $total_repos repositories."
echo "Active repositories: $active, Inactive repositories: $inactive"
