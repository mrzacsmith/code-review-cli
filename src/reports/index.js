const fs = require('fs').promises;
const path = require('path');

/**
 * Format date for filename (local time, MM-DD-YYYY_HH-mm-ss)
 */
function formatDateForFilename(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${month}-${day}-${year}_${hours}-${minutes}-${seconds}`;
}

/**
 * Format date for report (local time, HH:mm:ss MM-DD-YYYY TZ)
 */
function formatDateForReport(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  // Get timezone abbreviation
  const timezone = Intl.DateTimeFormat('en', { timeZoneName: 'short' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value || 'Local';
  
  return `${hours}:${minutes}:${seconds} ${month}-${day}-${year} ${timezone}`;
}

/**
 * Generate report filename
 */
function generateReportFilename(commit, scanType = 'fast') {
  const now = new Date();
  const dateStr = formatDateForFilename(now);
  const shortHash = commit.shortHash || commit.hash.substring(0, 7);
  return `${dateStr}_${shortHash}_${scanType}.md`;
}

/**
 * Generate markdown report
 */
function generateReport(data) {
  const {
    commit,
    scanType,
    filesChanged,
    providers,
    results,
  } = data;

  // Calculate total models from providers
  const totalModels = providers.reduce((sum, p) => sum + (p.models?.length || 0), 0);
  let localModels = 0;
  let apiModels = 0;
  
  for (const provider of providers) {
    const modelCount = (provider.models || []).length;
    if (provider.name === 'ollama') {
      localModels += modelCount;
    } else {
      apiModels += modelCount;
    }
  }

  let report = `# Code Review Report\n\n`;
  report += `**Date:** ${formatDateForReport(new Date())}\n`;
  report += `**Commit:** ${commit.hash}\n`;
  report += `**Short Hash:** ${commit.shortHash}\n`;
  report += `**Message:** ${commit.message}\n`;
  report += `**Author:** ${commit.author}\n`;
  report += `**Scan Type:** ${scanType}\n`;
  
  if (localModels > 0 && apiModels > 0) {
    report += `**Local LLMs:** ${localModels}\n`;
    report += `**API LLMs:** ${apiModels}\n`;
  } else if (localModels > 0) {
    report += `**Local LLMs:** ${localModels}\n`;
  } else if (apiModels > 0) {
    report += `**API LLMs:** ${apiModels}\n`;
  }
  
  report += `**Total LLM Models:** ${totalModels}\n\n`;

  // Files changed summary
  if (filesChanged && filesChanged.length > 0) {
    report += `## Files Changed\n\n`;
    for (const file of filesChanged) {
      const changes = `+${file.insertions || 0}, -${file.deletions || 0}`;
      report += `- \`${file.path}\` (${changes})\n`;
    }
    report += `\n`;
  }

  // Provider results
  for (const providerResult of results) {
    report += `---\n\n`;
    report += `## Review: ${providerResult.provider}\n\n`;

    if (providerResult.results) {
      for (const modelResult of providerResult.results) {
        report += `### Model: ${modelResult.model}\n\n`;
        
        if (modelResult.success) {
          report += `**Processing Time:** ${(modelResult.processingTime / 1000).toFixed(2)}s\n\n`;
          report += `${modelResult.review}\n\n`;
        } else {
          report += `**Error:** ${modelResult.error}\n\n`;
        }
      }
    }
  }

  // Summary section
  report += `---\n\n`;
  report += `## Summary\n\n`;

  const successfulReviews = results.flatMap((r) => 
    r.results?.filter((mr) => mr.success && mr.review) || []
  );

  if (successfulReviews.length > 0) {
    report += `Successfully reviewed with ${successfulReviews.length} model(s).\n\n`;
  } else {
    report += `⚠️ No successful reviews. All models failed.\n\n`;
  }

  return report;
}

/**
 * Save report to file
 */
async function saveReport(reportContent, filename, reportsDir = '.code-reviews') {
  // Ensure reports directory exists
  await fs.mkdir(reportsDir, { recursive: true });

  const filePath = path.join(reportsDir, filename);
  await fs.writeFile(filePath, reportContent, 'utf8');

  return filePath;
}

/**
 * Generate and save report
 */
async function generateAndSaveReport(data, reportsDir) {
  const filename = generateReportFilename(data.commit, data.scanType);
  const reportContent = generateReport(data);
  const filePath = await saveReport(reportContent, filename, reportsDir);

  return {
    filePath,
    filename,
    content: reportContent,
  };
}

module.exports = {
  generateReport,
  generateAndSaveReport,
  generateReportFilename,
};

